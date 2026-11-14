// @layer core
// Errors as values (decision 0179, EH5): parsing what was stored or sent never throws in core. A caller branches on
// `ok`; malformed data is then absent by a decision, never by a swallowed exception.

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const failed = (e: unknown): { ok: false; error: string } => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

export function tryJson(text: string): Parsed<unknown> {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (e) {
    return failed(e);
  }
}

export function tryUrl(text: string): Parsed<URL> {
  try {
    return { ok: true, value: new URL(text) };
  } catch (e) {
    return failed(e);
  }
}
