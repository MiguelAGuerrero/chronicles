// @layer core
import type { Audio, AudioKind, InstalledModel, ModelSpec } from './engine';

/** A model download that has been written to a temporary place and not yet moved into place (MX12). */
export interface StagedModel {
  /** The SHA-256 of what was written, hex. */
  hash: string;
  /** Moves it into place in one step: a half-written file is never the model. */
  commit(): Promise<InstalledModel>;
  /** Deletes what was written. */
  discard(): Promise<void>;
}

/** The model's files on this platform: the cache directory on a phone, Cache Storage on the web (MX13). */
export interface ModelFiles {
  /** The room left, in bytes, or null when it cannot be read. */
  free(): Promise<number | null>;
  /** The installed model for this spec, or null when it is not there (never installed, or evicted). */
  find(spec: ModelSpec): Promise<InstalledModel | null>;
  /** The only way to the network (MX11, MX12): called by the Download tap and nothing else. */
  download(spec: ModelSpec): Promise<StagedModel>;
  /** Deletes the installed model for this spec; true when something was there. */
  remove(spec: ModelSpec): Promise<boolean>;
  /** Deletes every other model file (an earlier engine's), once this one is installed (MX32). */
  removeOthers(keep: ModelSpec): Promise<void>;
}

/** A memo's audio in the form an engine takes, and the means to let go of it (MX20). */
export interface Decoded {
  audio: Audio;
  dispose(): Promise<void>;
}

export interface Decoder {
  /** Whether this platform can give the audio in this form. */
  can(kind: AudioKind): boolean;
  /** The memo (a media reference) as `kind`; only called for a kind `can` says yes to. */
  decode(ref: string, kind: AudioKind): Promise<Decoded>;
  /** A memo's own file as a URI an engine can read (for the `container` kind); the reference as it is when absent. */
  container?(ref: string): Promise<string>;
}

/** What the run asks the world: whether the app is in front, and whether a walk is recording (MX17). */
export interface RunEnv {
  isForeground(): boolean;
  isRecording(): boolean;
}
