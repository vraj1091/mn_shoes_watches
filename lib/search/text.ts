/**
 * Search text handling: normalising queries, expanding synonyms, building a safe FTS5 query and
 * suggesting a spelling ("Did you mean"). Pure functions; the index itself is lib/search/engine.ts.
 */

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const tokenize = (text: string) => normalise(text).split(" ").filter(Boolean);

/** FTS5 trigram matching needs at least 3 characters. */
export const MIN_TOKEN = 3;

export type Synonym = { term: string; synonym: string; twoWay: boolean };

/**
 * Each query word becomes a group of alternatives. A one-way entry ("sneker" → "sneakers") replaces
 * the word, because it is a correction; a two-way entry ("chrono" ↔ "chronograph") adds to it.
 */
export function expandSynonyms(tokens: string[], synonyms: Synonym[]): string[][] {
  return tokens.map((token) => {
    const replacement = synonyms.find((entry) => !entry.twoWay && normalise(entry.term) === token);
    if (replacement) return [normalise(replacement.synonym)];
    const alternatives = new Set([token]);
    for (const entry of synonyms) {
      if (!entry.twoWay) continue;
      const term = normalise(entry.term);
      const synonym = normalise(entry.synonym);
      if (term === token) alternatives.add(synonym);
      if (synonym === token) alternatives.add(term);
    }
    return [...alternatives];
  });
}

/** Quoted terms only, so nothing a shopper types can break the FTS5 query syntax. */
export function buildFtsQuery(groups: string[][], mode: "all" | "any" = "all"): string | null {
  const clauses = groups
    .map((alternatives) => alternatives.filter((term) => term.length >= MIN_TOKEN).map((term) => `"${term.replace(/"/g, "")}"`))
    .filter((alternatives) => alternatives.length > 0)
    .map((alternatives) => (alternatives.length === 1 ? alternatives[0]! : `(${alternatives.join(" OR ")})`));
  if (clauses.length === 0) return null;
  return clauses.join(mode === "all" ? " AND " : " OR ");
}

export function levenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
      rowMin = Math.min(rowMin, current[j]!);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * Closest known word for each unknown query word: one typo allowed up to 5 letters, two after.
 * Returns null when every word is already known or nothing close exists.
 */
export function suggestSpelling(tokens: string[], vocabulary: Map<string, number>): string | null {
  let changed = false;
  const corrected = tokens.map((token) => {
    if (token.length < 4 || vocabulary.has(token) || /\d/.test(token)) return token;
    const allowed = token.length <= 5 ? 1 : 2;
    let best: { word: string; distance: number; frequency: number } | null = null;
    for (const [word, frequency] of vocabulary) {
      const distance = levenshtein(token, word, allowed);
      if (distance > allowed) continue;
      if (!best || distance < best.distance || (distance === best.distance && frequency > best.frequency)) {
        best = { word, distance, frequency };
      }
    }
    if (!best) return token;
    changed = true;
    return best.word;
  });
  return changed ? corrected.join(" ") : null;
}
