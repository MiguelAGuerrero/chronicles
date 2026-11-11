// @layer core
/**
 * The one thing the app knows about a transcriber (specs/memo-transcripts, MX28-MX32): an `Engine`. A library lives
 * behind an adapter in `engines/`; the shells, the views, the table and the settings depend on this and on nothing
 * else, so a more optimized engine is one new adapter and one registry line.
 */

/** The audio an engine can be handed, best first in its `inputs` (MX31). */
export type AudioKind = 'container' | 'wav16k' | 'samples16k';

export type Audio =
  /** The memo's own file, in whatever container it was recorded in. */
  | { kind: 'container'; uri: string }
  /** A 16 kHz mono 16-bit PCM WAV file. */
  | { kind: 'wav16k'; path: string }
  /** 16 kHz mono samples in memory. */
  | { kind: 'samples16k'; data: Float32Array };

/** The model an engine needs: one pinned file (MX12, MX23). `size` is said in words; `bytes` only checks the room. */
export interface ModelSpec {
  url: string;
  sha256: string;
  bytes: number;
  size: string;
  /** Names the engine and the file: a change of tag reads every transcript as stale (MX5, MX32). */
  tag: string;
}

/** Where the installed model is, as the engine's own `load` needs it: a path on a phone, a cache key on the web. */
export interface InstalledModel {
  ref: string;
}

export interface Engine {
  id: string;
  model: ModelSpec;
  /** An engine that cannot say this is refused at registration (MX29): nothing may leave the device. */
  offline: true;
  inputs: AudioKind[];
  /** Whether this device can run it at all (WebAssembly, an AudioContext, the native module). */
  available(): Promise<boolean>;
  /** Loads the installed model into memory; held only for a run (MX16). */
  load(model: InstalledModel): Promise<void>;
  /** The words in the audio, as heard; an empty string for silence. */
  transcribe(audio: Audio, signal?: AbortSignal): Promise<string>;
  /** Lets the model go: nothing stays in memory (MX16). */
  release(): Promise<void>;
}

/** Every member of `Engine`: the contract suite names each (MX29). */
export const ENGINE_MEMBERS = ['id', 'model', 'offline', 'inputs', 'available', 'load', 'transcribe', 'release'] as const;

const KINDS: AudioKind[] = ['container', 'wav16k', 'samples16k'];

/** The registry's gate: an engine that is not offline, takes no audio or has no pinned file is refused (MX29). */
export function registerEngine(e: Engine): Engine {
  if ((e as { offline?: unknown }).offline !== true) throw new Error(`Engine ${e.id}: it must say it works offline.`);
  if (!e.inputs?.length || !e.inputs.every((k) => KINDS.includes(k))) throw new Error(`Engine ${e.id}: it must name the audio inputs it takes.`);
  if (!/^[0-9a-f]{64}$/.test(e.model?.sha256 ?? '')) throw new Error(`Engine ${e.id}: its model needs a pinned sha256.`);
  if (!e.model.url || !e.model.tag || !e.model.size) throw new Error(`Engine ${e.id}: its model needs a url, a tag and a size in words.`);
  return e;
}

/** The first audio kind the engine takes that this platform can give (MX31), or null when none. */
export function firstInput(inputs: AudioKind[], can: (k: AudioKind) => boolean): AudioKind | null {
  for (const k of inputs) if (k === 'container' || can(k)) return k;
  return null;
}
