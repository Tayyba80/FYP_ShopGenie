export interface PreprocessedQuery {
  raw: string;
  normalized: string;
  tokens: string[];
}

export function preprocessQuery(query: string): PreprocessedQuery {
  const raw = query.trim();

  const normalized = raw
    .toLowerCase()
    .replace(/[^\w\s.$-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = normalized.split(" ").filter(Boolean);

  return {
    raw,
    normalized,
    tokens,
  };
}
