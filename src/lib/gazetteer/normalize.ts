// @layer core
const OWN: Record<string, string> = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ł': 'l', 'ı': 'i' };
const SAINT: Record<string, string> = { saint: 'st', sainte: 'ste' };

/** Folding for matching (GZ3): case, diacritics and punctuation do not matter, and Saint is St. */
export function fold(text: string): string {
  const flat = text
    .toLowerCase()
    .replace(/[ßæœøđðþłı]/g, (c) => OWN[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return flat
    .split(' ')
    .map((w) => SAINT[w] ?? w)
    .join(' ');
}

/** The words of text, folded. */
export function words(text: string): string[] {
  const f = fold(text);
  return f ? f.split(' ') : [];
}
