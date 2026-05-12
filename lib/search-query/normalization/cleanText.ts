export function cleanText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ");
}

export function canonicalizeText(text: string): string {
  return cleanText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
