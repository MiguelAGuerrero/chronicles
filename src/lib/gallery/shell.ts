// @layer shell
import type { CapturePatch } from '../captureBus';
import { facedAll, type Faced } from '../moment';
import type { Ports } from '../ports/types';
import { streetAt } from '../resurface/context';
import { createStore } from '../store';
import type { Walk } from '../types';
import { withPiecePatch } from './layout';
import type { GalleryView, Show, Zoom } from './types';
import { DEFAULT_VIEW, readView } from './view';

export interface GalleryState {
  status: 'idle' | 'loading' | 'ready' | 'failed';
  moments: Faced[];
  walks: Walk[];
  /** Streets of loose moments, by moment id (MG6): a name, null for none near; absent until read. */
  streets: Record<string, string | null>;
  /** The kind shown (MG9) and Years, Months or Days (MG19): never saved. */
  show: Show;
  zoom: Zoom;
  /** Sort, size and shape (MG18, MG20-MG22): kept in meta. */
  view: GalleryView;
}

/** How far around a loose moment's fix its street is looked for, as Memories' context line does (MC1). */
const READ_M = 45;
const M_PER_DEG = 111_320;

/**
 * Media gallery's shell (specs/media-gallery): it reads every moment and walk (rows, never media) each time Media is
 * shown (MG14), keeps the saved view in meta (MG22), reads the streets of loose moments for the days on screen (MG6),
 * and applies an edit saved in the viewer at once (MG14). The newest read wins.
 */
/** Small copies and stills are made by `lib/thumbs`, one queue for every preview (video-thumbnails audit 4). */
export function createGallery(p: Pick<Ports, 'db'>) {
  const store = createStore<GalleryState>({ status: 'idle', moments: [], walks: [], streets: {}, show: 'all', zoom: 'days', view: DEFAULT_VIEW });
  let reads = 0;
  let saving: Promise<unknown> = Promise.resolve();
  let streetQueue: Promise<unknown> = Promise.resolve();
  const asked = new Set<string>();
  let lastVisit: number | null = null;

  return {
    store,
    /** Reads every moment and walk again (MG14). A slower, older read never overwrites a newer one. */
    async load(): Promise<void> {
      const mine = ++reads;
      store.set((s) => ({ ...s, status: s.status === 'ready' ? 'ready' : 'loading' }));
      try {
        const [moments, walks] = await Promise.all([p.db.momentsBetween(0, Number.MAX_SAFE_INTEGER), p.db.listWalks()]);
        if (mine !== reads) return;
        store.set((s) => ({ ...s, status: 'ready', moments: facedAll(moments), walks }));
      } catch {
        if (mine === reads) store.set((s) => ({ ...s, status: s.status === 'ready' ? 'ready' : 'failed' }));
      }
    },
    /** The saved view (MG22): the default when none is kept or it can't be read. */
    async loadView(): Promise<void> {
      const raw = await p.db.getMeta('gallery_view').catch(() => null);
      let v: unknown = null;
      try {
        v = raw ? JSON.parse(raw) : null;
      } catch {
        v = null;
      }
      store.set((s) => ({ ...s, view: readView(v) }));
    },
    /** Changes the view at once, then keeps it; writes go one after another, so the last choice is the one kept. */
    setView(change: Partial<GalleryView>): Promise<void> {
      store.set((s) => ({ ...s, view: { ...s.view, ...change } }));
      const v = store.get().view;
      saving = saving.then(() => p.db.setMeta('gallery_view', JSON.stringify(v))).catch(() => {});
      return saving.then(() => {});
    },
    setShow: (show: Show) => store.set((s) => ({ ...s, show })),
    setZoom: (zoom: Zoom) => store.set((s) => ({ ...s, zoom })),
    /** A new open of Chronicle (MG9, MG19): All Items and Days again. The saved view stays. */
    reset: () => store.set((s) => ({ ...s, show: 'all', zoom: 'days' })),
    /**
     * Media shown, with `visit` the count of times the app went elsewhere (`chronicleSection.visit()`): a new count is
     * a new open of Chronicle, so the filter and the zoom go back (MG9); Memories and back is the same open.
     */
    opened(visit: number): void {
      if (visit !== lastVisit) store.set((s) => ({ ...s, show: 'all', zoom: 'days' }));
      lastVisit = visit;
    },
    /** An edit saved in the viewer shows on its tile at once (MG14). */
    patch(pieceId: string, change: CapturePatch): void {
      store.set((s) => ({ ...s, moments: withPiecePatch(s.moments, pieceId, change) }));
    },
    /**
     * The streets of these loose moments (MG6), each read once, one read at a time; a failed read is asked again
     * next time. A moment with no fix is "no street".
     */
    async streetsFor(ids: string[]): Promise<void> {
      const todo = ids.filter((id) => !asked.has(id) && !(id in store.get().streets));
      for (const id of todo) asked.add(id);
      const readOne = async (id: string): Promise<void> => {
        const m = store.get().moments.find((x) => x.id === id);
        if (!m) return void asked.delete(id);
        const fix = m.lat != null && m.lon != null ? ([m.lon, m.lat] as [number, number]) : null;
        try {
          let name: string | null = null;
          if (fix) {
            const dLon = READ_M / (M_PER_DEG * Math.max(0.05, Math.cos((fix[1] * Math.PI) / 180)));
            const dLat = READ_M / M_PER_DEG;
            const segments = await p.db.getSegmentsIn([fix[0] - dLon, fix[1] - dLat, fix[0] + dLon, fix[1] + dLat]);
            name = streetAt(fix, segments, m.segment_id)?.name ?? null;
          }
          store.set((s) => ({ ...s, streets: { ...s.streets, [id]: name } }));
        } catch {
          asked.delete(id);
        }
      };
      await Promise.all(todo.map((id) => (streetQueue = streetQueue.then(() => readOne(id)))));
    },
  };
}

export type Gallery = ReturnType<typeof createGallery>;
