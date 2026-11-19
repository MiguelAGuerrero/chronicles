/**
 * Whether a collection is worth sending to a map's source (replay ceremony RC4, decision 0206). Every send is a round
 * trip through the map's worker and a reload of the source's tiles, so a source is never sent what it already holds:
 * not the same object, not another object of the same content, and not an empty collection when it is empty already
 * (a source is made empty). Pure, so `npm test` holds it; the web map's one gate (`WalkMap.web.tsx` `sendData`) asks it.
 *
 * "The same content" is read in full, never from a line's ends: a trace whose middle was settled again with its ends
 * where they were is a change. The reading is two running sums over every number and every property, far cheaper than
 * the send it saves (the map turns the collection into text itself).
 */

/** What a source was last sent, or was found to hold already. */
export interface Sent {
  data: object;
  sig: string;
}

type Collection = { features?: readonly { geometry?: { type?: string; coordinates?: unknown } | null; properties?: Record<string, unknown> | null; id?: unknown }[] };

/** The signature of the empty collection. */
const EMPTY = '0';

/** Two running sums over a collection's content, as text: equal content gives equal text. */
export function dataSig(data: object): string {
  const features = (data as Collection).features ?? [];
  if (!features.length) return EMPTY;
  let a = 2166136261;
  let b = 5381;
  const mix = (n: number) => {
    a = Math.imul(a ^ n, 16777619);
    b = (Math.imul(b, 33) + n) | 0;
  };
  const num = (x: number) => {
    // A coordinate to a hundred-millionth of a degree (a millimetre), in two halves so nothing is lost to 32 bits.
    const v = Math.round(x * 1e8);
    mix(v | 0);
    mix(Math.floor(v / 4294967296) | 0);
  };
  const text = (s: string) => {
    for (let i = 0; i < s.length; i++) mix(s.charCodeAt(i));
    mix(-1);
  };
  const coords = (c: unknown) => {
    if (typeof c === 'number') return num(c);
    if (!Array.isArray(c)) return;
    mix(c.length);
    for (const x of c) coords(x);
  };
  for (const f of features) {
    text(f.geometry?.type ?? '');
    coords(f.geometry?.coordinates);
    if (f.id != null) text(String(f.id));
    const props = f.properties;
    if (props) for (const k in props) {
      text(k);
      const v = props[k];
      if (typeof v === 'number') num(v);
      else text(typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));
    }
    mix(-2);
  }
  return `${features.length}:${(a >>> 0).toString(36)}:${(b >>> 0).toString(36)}`;
}

/**
 * Whether `data` is sent to a source last sent `last` (undefined for a source as it was made: empty), and what the
 * source holds afterwards.
 */
export function nextSend(last: Sent | undefined, data: object): { send: boolean; sent: Sent } {
  if (last && last.data === data) return { send: false, sent: last };
  const sig = dataSig(data);
  return { send: sig !== (last ? last.sig : EMPTY), sent: { data, sig } };
}
