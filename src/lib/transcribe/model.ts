// @layer shell
import type { Ports } from '../ports/types';
import { createStore } from '../store';
import { COPY, roomEnough, stateLine } from './core';
import type { Engine, InstalledModel } from './engine';
import type { ModelFiles } from './types';

/** Meta: the switch (MX10): '1' once the model is installed by the owner's Download tap; absent or '0' is off. */
export const ON_KEY = 'transcribe_on';

export interface ModelState {
  /** The switch. */
  on: boolean;
  installed: boolean;
  /** This device can run the engine at all (MX27). */
  supported: boolean;
  /** The dialog is up: the size in words and Download, Not now (MX11). */
  asking: boolean;
  /** The model is coming down; nothing more is said (MX23: no progress). */
  busy: boolean;
  /** The size of the model, in words. */
  size: string;
  /** The row is open, so its state is said even with the switch off (MX13). */
  open: boolean;
  /** One-off words after Download or Remove (a failure, no room, the room back); cleared by the next action. */
  note: string | null;
  /** What is said under the row (MX13): the note, else the state, else nothing. */
  line: string | null;
}

/**
 * The model's life on the device (MX10-MX15, MX27, MX32): off by default, asked for in words, fetched by the Download
 * tap and by nothing else, checked against its pinned hash and moved into place whole, removed on the owner's tap.
 * A launch, a run and a retry never fetch: `init` only looks.
 */
export function createModelStore(p: Pick<Ports, 'db'>, d: { engine: Engine; files: ModelFiles }) {
  const spec = d.engine.model;
  const store = createStore<ModelState>({
    on: false, installed: false, supported: true, asking: false, busy: false, size: spec.size, open: false, note: null, line: null,
  });
  let installed: InstalledModel | null = null;

  const set = (patch: Partial<ModelState>) =>
    store.set((s) => {
      const n = { ...s, ...patch };
      return { ...n, line: n.note ?? stateLine({ on: n.on, open: n.open, installed: n.installed, room: true, supported: n.supported }) };
    });

  return {
    store,
    /** What a run loads, or null (not installed). */
    installedModel: (): InstalledModel | null => installed,
    /** Looks at the switch, the file and the engine. Fetches nothing. */
    async init() {
      const on = (await p.db.getMeta(ON_KEY).catch(() => null)) === '1';
      const supported = await d.engine.available().catch(() => false);
      installed = await d.files.find(spec).catch(() => null);
      set({ on, supported, installed: !!installed });
    },
    /** The row is looked at, or put away. */
    open: (open: boolean) => set({ open, note: null }),
    /** The switch turned on: straight on if the model is here, else the dialog (MX11). */
    async turnOn() {
      if (!store.get().supported) return set({ open: true, note: null });
      if (installed) {
        await p.db.setMeta(ON_KEY, '1');
        return set({ on: true, note: null });
      }
      set({ asking: true, open: true, note: null });
    },
    /** The dialog, asked for. */
    ask: () => set({ asking: true, open: true, note: null }),
    /** Not now: the switch stays off (MX11). */
    decline: () => set({ asking: false, on: false, note: null }),
    /** Download: the only way a fetch starts (MX11, MX12, MX14). */
    async download() {
      if (!store.get().supported || store.get().busy) return;
      set({ busy: true, note: null });
      const free = await d.files.free().catch(() => null);
      if (!roomEnough(free, spec.bytes)) return set({ busy: false, asking: false, open: true, note: COPY.noRoom });
      try {
        const staged = await d.files.download(spec);
        if (staged.hash !== spec.sha256) {
          await staged.discard().catch(() => {});
          throw new Error('not the pinned file');
        }
        installed = await staged.commit();
        await d.files.removeOthers(spec).catch(() => {});
        await p.db.setMeta(ON_KEY, '1');
        set({ busy: false, asking: false, on: true, installed: true, note: null });
      } catch {
        set({ busy: false, asking: false, on: false, installed: !!installed, open: true, note: COPY.failed });
      }
    },
    /** The switch turned off: the file stays unless the owner then taps Remove (MX15). */
    async turnOff() {
      await p.db.setMeta(ON_KEY, '0');
      set({ on: false, asking: false, open: false, note: null });
      return { canRemove: installed !== null };
    },
    /** Remove the model: the file goes, every transcript stays (MX15). */
    async remove() {
      await d.files.remove(spec).catch(() => false);
      installed = null;
      set({ installed: false, on: false, note: COPY.removed });
    },
  };
}
