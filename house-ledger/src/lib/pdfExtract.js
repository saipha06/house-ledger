import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Strips content the classification task doesn't need before it ever leaves
// this function — account/card numbers, and any chunk of text that repeats
// near-verbatim across most pages. Real statements restate the cardholder's
// name, account number, and statement period in a header/footer on every
// page; actual transaction lines never repeat byte-for-byte like that. This
// is bank-agnostic on purpose (no per-bank wording rules, just shape and
// repetition), so it doesn't need updating when a format changes — it just
// won't catch everything, which is fine: the goal is materially reducing
// what reaches the classification API, not guaranteeing zero PII.
function redactSensitive(pages) {
  const numberPattern = /\b(?:\d[\s-]?){12,19}\b/g;
  // State abbreviation + ZIP is a reasonably specific, low-false-positive
  // signal for "this is a mailing address" — catches a one-time-occurrence
  // address that the repetition check below can't (it only appears once,
  // usually on a summary page, not repeated per page like the header).
  const zipPattern = /\b[A-Z]{2}\s+\d{5}(-\d{4})?\b/g;
  let cleaned = pages.map((p) => p.replace(numberPattern, "[redacted]").replace(zipPattern, "[redacted]"));

  if (cleaned.length > 1) {
    const chunksOf = (text) =>
      text
        .split(/(?<=[.!?])\s+|\s{2,}/)
        .map((c) => c.trim())
        .filter((c) => c.length >= 12);
    const counts = new Map();
    cleaned.forEach((page) => {
      new Set(chunksOf(page)).forEach((chunk) => counts.set(chunk, (counts.get(chunk) || 0) + 1));
    });
    const threshold = Math.max(2, Math.ceil(cleaned.length * 0.5));
    const boilerplate = [...counts.entries()].filter(([, n]) => n >= threshold).map(([c]) => c);
    cleaned = cleaned.map((page) => boilerplate.reduce((text, chunk) => text.split(chunk).join(" "), page));
  }

  return cleaned;
}

// Text-based PDFs only (no OCR) — matches the statement-upload feature's
// assumption that bank statements are downloaded as text PDFs, not scans.
export async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return redactSensitive(pages).join("\n\n");
}
