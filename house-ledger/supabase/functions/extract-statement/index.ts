// Takes raw text already extracted client-side (via pdf.js) from a bank
// statement PDF, sends it to Gemini for transaction extraction + tier
// classification, and returns the parsed list. No DB writes here — this is
// a pure transform, matching the app's "review before it touches the real
// expenses table" design.
//
// Requires GEMINI_API_KEY as a function secret:
//   supabase secrets set GEMINI_API_KEY=...
//
// Deploy JWT-verified (the default) so only signed-in Casa users can call
// this — it costs real (if free-tier) Gemini usage per call.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return new Response(JSON.stringify({ error: "Missing statement text" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
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
