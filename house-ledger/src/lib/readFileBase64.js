// PDF parsing itself runs server-side now (see
// supabase/functions/extract-statement) — pdf.js's browser Worker (and its
// main-thread module-loading fallback) hit a reproducible crash on at
// least one WKWebView-based iOS browser. This is all the client needs to
// do: read the file into a base64 string to upload.
export function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === "string" ? result.split(",")[1] || "" : "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}
