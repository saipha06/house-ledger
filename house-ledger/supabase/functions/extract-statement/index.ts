// Takes a bank statement PDF (base64-encoded), extracts its text with
// pdf.js running server-side, redacts obvious PII before it goes anywhere
// near an LLM, then sends the redacted text to Gemini for transaction
// extraction + tier classification. No DB writes here — this is a pure
// transform, matching the app's "review before it touches the real
// expenses table" design.
//
// PDF parsing was originally client-side, but pdf.js's browser Worker (and
// its module-loading fallback) hit a reproducible crash on at least one
// WKWebView-based iOS browser that couldn't be diagnosed without device
// devtools access. Running it server-side, in a plain Deno environment
// where pdf.js already runs reliably without a Worker at all, sidesteps
// that whole compatibility surface. Trade-off: the raw (unredacted) PDF
// now briefly reaches this function before redaction runs, whereas before
// it never left the browser — Gemini's exposure is unchanged either way.
//
// Requires GEMINI_API_KEY as a function secret:
//   supabase secrets set GEMINI_API_KEY=...
//
// Deploy JWT-verified (the default) so only signed-in Casa users can call
// this — it costs real (if free-tier) Gemini usage per call.

import * as pdfjsLib from "npm:pdfjs-dist@6.3.289/legacy/build/pdf.mjs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIERS = ["shared_high", "shared_maybe", "personal_uncertain", "personal_confident"];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          description: { type: "string" },
          summary: { type: "string" },
          amount: { type: "number" },
          tier: { type: "string", enum: TIERS },
        },
        required: ["date", "description", "summary", "amount", "tier"],
      },
    },
  },
  required: ["transactions"],
};

const PROMPT_INSTRUCTIONS = `You are analyzing a bank statement for a household expense-tracking app shared by 4 housemates.

Extract every individual purchase/debit transaction from the statement text. For each one, return:
- date: the transaction date as printed (prefer YYYY-MM-DD if it can be determined, otherwise as printed)
- description: the raw merchant/description string as printed
- summary: a short, human-readable one-line summary a person would recognize at a glance (e.g. "Grocery run at Trader Joe's" instead of "TRADER JOE S #123 SEATTLE WA")
- amount: the transaction amount as a positive number
- tier: exactly one of:
  - "shared_high": clearly a shared household expense (groceries, utilities, rent, household supplies, laundry)
  - "shared_maybe": ambiguous — could be shared (dining/takeout, joint outings)
  - "personal_uncertain": probably personal, but not confidently so
  - "personal_confident": clearly personal (subscriptions, gas, solo shopping/travel, anything obviously individual)

Bias toward under-flagging: when genuinely unsure between two tiers, prefer the more personal one. It's cheap for a person to promote a missed shared expense by hand; it's annoying to reject unwanted noise on every upload.

Skip anything that is not an individual purchase: statement headers/footers, account summaries, interest charges, incoming payments/credits/refunds/deposits, running balance figures.

Return only transactions actually present in the text below — do not invent or infer ones that aren't there.

STATEMENT TEXT:
`;

// Strips content the classification task doesn't need before it ever
// reaches Gemini — account/card numbers, and any chunk of text repeating
// near-verbatim across pages. Real statements restate the cardholder's
// name, account number, and statement period in a header/footer on every
// page; actual transaction lines never repeat byte-for-byte like that.
// Bank-agnostic on purpose (shape + repetition, not per-bank wording) —
// this is heuristic risk-reduction, not a guarantee of complete PII removal.
function redactSensitive(pages: string[]): string[] {
  const numberPattern = /\b(?:\d[\s-]?){12,19}\b/g;
  const zipPattern = /\b[A-Z]{2}\s+\d{5}(-\d{4})?\b/g;
  let cleaned = pages.map((p) => p.replace(numberPattern, "[redacted]").replace(zipPattern, "[redacted]"));

  if (cleaned.length > 1) {
    const chunksOf = (text: string) =>
      text
        .split(/(?<=[.!?])\s+|\s{2,}/)
        .map((c) => c.trim())
        .filter((c) => c.length >= 12);
    const counts = new Map<string, number>();
    cleaned.forEach((page) => {
      new Set(chunksOf(page)).forEach((chunk) => counts.set(chunk, (counts.get(chunk) || 0) + 1));
    });
    const threshold = Math.max(2, Math.ceil(cleaned.length * 0.5));
    const boilerplate = [...counts.entries()].filter(([, n]) => n >= threshold).map(([c]) => c);
    cleaned = cleaned.map((page) => boilerplate.reduce((text, chunk) => text.split(chunk).join(" "), page));
  }

  return cleaned;
}

async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // deno-lint-ignore no-explicit-any
    pages.push(content.items.map((item: any) => item.str).join(" "));
  }
  return redactSensitive(pages).join("\n\n");
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { pdfBase64 } = await req.json();
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Missing pdfBase64" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let text: string;
    try {
      text = await extractPdfText(base64ToBytes(pdfBase64));
    } catch (err) {
      return new Response(JSON.stringify({ error: "Reading the PDF failed: " + String(err) }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!text.trim()) {
      return new Response(
        JSON.stringify({ error: "Couldn't find any text in that PDF — is it a scanned image rather than a text PDF?" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server missing GEMINI_API_KEY" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT_INSTRUCTIONS + text.slice(0, 400000) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ error: "Gemini request failed", detail: errText }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await geminiRes.json();
    const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      return new Response(JSON.stringify({ error: "Gemini returned no content", detail: data }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonText);
    const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];

    return new Response(JSON.stringify({ transactions }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
