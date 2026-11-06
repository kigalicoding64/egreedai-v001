export function recoverSingleFile(text: string): string | null {
  const t = (text || "").trim();
  if (!t) return null;
  // Content field from a truncated/mis-escaped JSON object.
  const m = t.match(/"content"\s*:\s*"([\s\S]*)/);
  if (m) {
    let body = m[1].replace(/"\s*}\s*]\s*}\s*(```)?\s*$/, "").replace(/"\s*}\s*$/, "");
    body = body.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    return body.trim() ? body : null;
  }
  const fence = t.match(/```[\w.+-]*\n([\s\S]*?)```/);
  if (fence && fence[1].trim()) return fence[1];
  if (t.startsWith("{") || t.startsWith("[")) return null;
  return t;
}
