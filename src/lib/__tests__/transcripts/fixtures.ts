/// <reference types="node" />
// Fakes for the memo-transcripts slice (specs/memo-transcripts): an engine, the model's files, a decoder and the
// moments a run reads. The modules under test are loaded inside each test body (`load`), so a test written before
// its module fails by itself and the rest of the file runs.
export const mod = (name: string): Promise<any> => import(`../../transcribe/${name}`);

export const SPEC = {
  url: 'https://miguelaguerrero.github.io/chronicles-data/models/fake-a.bin',
  sha256: 'a'.repeat(64),
  bytes: 60 * 1024 * 1024,
  size: 'about sixty megabytes',
  tag: 'fake-a@aaaa',
};
export const SPEC_B = { ...SPEC, url: SPEC.url.replace('fake-a', 'fake-b'), sha256: 'b'.repeat(64), tag: 'fake-b@bbbb' };

/** An engine that loads nothing: it counts loads and releases and says what a test tells it to. */
export function fakeEngine(over: Record<string, unknown> = {}) {
  const e: any = {
    id: 'fake',
    model: SPEC,
    offline: true,
    inputs: ['wav16k'],
    loads: 0,
    releases: 0,
    live: false,
    active: 0,
    maxActive: 0,
    seen: [] as any[],
    say: (_a: any, n: number) => `words ${n}`,
    gate: null as Promise<void> | null,
    async available() {
      return true;
    },
    async load() {
      e.loads++;
      e.live = true;
    },
    async transcribe(audio: any) {
      if (!e.live) throw new Error('not loaded');
      e.active++;
      e.maxActive = Math.max(e.maxActive, e.active);
      try {
        e.seen.push(audio);
        if (e.gate) await e.gate;
        return e.say(audio, e.seen.length);
      } finally {
        e.active--;
      }
    },
    async release() {
      e.releases++;
      e.live = false;
    },
    ...over,
  };
  return e;
}

/** The model's files: a map of what is installed, and a count of every download (the only way to the network). */
export function fakeFiles(o: { free?: number | null; hash?: string; failDownload?: boolean } = {}) {
  const f: any = {
    installed: new Map<string, string>(),
    downloads: 0,
    discarded: 0,
    committed: 0,
    removedOthers: 0,
    freeBytes: o.free === undefined ? 1e12 : o.free,
    async free() {
      return f.freeBytes;
    },
    async find(spec: any) {
      return f.installed.has(spec.tag) ? { ref: `ref:${spec.tag}` } : null;
    },
    async download(spec: any) {
      f.downloads++;
      if (o.failDownload) throw new Error('offline');
      return {
        hash: o.hash ?? spec.sha256,
        async commit() {
          f.committed++;
          f.installed.set(spec.tag, spec.tag);
          return { ref: `ref:${spec.tag}` };
        },
        async discard() {
          f.discarded++;
        },
      };
    },
    async remove(spec: any) {
      return f.installed.delete(spec.tag);
    },
    async removeOthers(keep: any) {
      f.removedOthers++;
      for (const k of [...f.installed.keys()]) if (k !== keep.tag) f.installed.delete(k);
    },
  };
  return f;
}

/** A decoder that can give the kinds it is told to; it counts what it was asked and what it let go. */
export function fakeDecoder(can: string[] = ['wav16k'], o: { failFor?: string } = {}) {
  const d: any = {
    calls: [] as { uri: string; kind: string }[],
    disposed: 0,
    can: (k: string) => can.includes(k),
    async decode(uri: string, kind: string) {
      d.calls.push({ uri, kind });
      if (o.failFor && uri.includes(o.failFor)) throw new Error('cannot decode');
      const audio = kind === 'samples16k' ? { kind, data: new Float32Array(4) } : { kind, path: `/tmp/${uri}.wav` };
      return {
        audio,
        async dispose() {
          d.disposed++;
        },
      };
    },
  };
  return d;
}

/** A voice-memo moment (its one piece shares its id), kept at `t`. */
export const memo = (id: string, t: number, more: Record<string, unknown> = {}): any => ({
  id,
  walk_id: null,
  t,
  lat: 41.81,
  lon: -71.4,
  segment_id: null,
  pieces: [{ id, moment_id: id, t, kind: 'voice', file_path: `memo-${id}.m4a`, body: '4000', ...more }],
});

/** A stored transcript row. */
export const row = (piece_id: string, text: string | null, tag = SPEC.tag, more: Record<string, unknown> = {}): any => ({
  piece_id,
  moment_id: piece_id,
  text,
  engine: 'fake',
  tag,
  made_at: 1,
  tries: 0,
  ...more,
});

/** What a view of the world says while the app runs. */
export const env = (o: { foreground?: boolean; recording?: boolean } = {}) => {
  const s = { foreground: o.foreground ?? true, recording: o.recording ?? false };
  return Object.assign(s, { isForeground: () => s.foreground, isRecording: () => s.recording });
};
