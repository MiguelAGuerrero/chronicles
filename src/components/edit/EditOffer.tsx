import { forwardRef, useEffect, useRef, useState } from 'react';
import type { CapturePatch } from '../../lib/captureBus';
import { afterCapture, editAfter, shotClosed, shotKept, shotTaken, type AfterCapture, type CameraWatch, type EditTarget, type HeldShot, type KeptShot } from '../../lib/editOffer';
import { dropTemp } from '../../lib/media';
import { facedOf, type Faced } from '../../lib/moment';
import { MediaEditor, type MediaEditorHandle } from './MediaEditor';

/**
 * The editor after a capture (ME23 as decision 0240 amends it): `open` it with what the camera kept and the screen draws
 * `MediaEditor` for that capture (a piece as itself) as soon as its list holds it; Close or Done ends it. Handed to the
 * camera (`takePhoto(…, editAfter.camera)`), it holds the shot full screen from the camera's return, so the map never
 * shows before the editor (tend captures T62). `waits`: the screen's editor waits (a memo recording, T60); `opens`:
 * asked as the camera returns, whether this screen would open its editor once the shot is kept.
 */
export function useEditAfterCapture(captures: readonly Faced[], opts: { waits?: boolean; opens?: () => boolean } = {}) {
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [shot, setShot] = useState<HeldShot | null>(null);
  const turns = useRef(0);
  // A shot closed while held (its ✕, Escape, Back): the piece its keep answers is never opened (tend captures audit 7).
  const dropped = useRef<{ turn: number; piece: string | null } | null>(null);
  const waits = !!opts.waits;
  const waitsNow = useRef(waits);
  const opensNow = useRef(opts.opens);
  useEffect(() => {
    waitsNow.current = waits;
    opensNow.current = opts.opens;
  });
  const view = afterCapture({ shot, target, captures, waits });
  // The picked files the held shots read, by turn (tend captures audit 8): the keep leaves each in place, and once it is
  // the editor's (`release`) it is let go as its shot leaves the view (closed, replaced, unmounted), or at once if it has
  // already left. A failed keep's file stays with the holder for Retry.
  const sources = useRef(new Map<number, string>());
  const letGo = useRef(new Set<string>());
  const shownNow = useRef<string | null>(null);
  const shown = view.show === 'none' ? null : (view.shot?.uri ?? null);
  useEffect(() => {
    shownNow.current = shown;
    if (!shown) return;
    return () => {
      shownNow.current = null;
      if (letGo.current.delete(shown)) dropTemp(shown);
    };
  }, [shown]);
  const camera: CameraWatch = {
    shot: (s) => {
      turns.current += 1;
      const turn = turns.current;
      const holds = !waitsNow.current && (opensNow.current?.() ?? true);
      if (holds) sources.current.set(turn, s.uri);
      setShot(shotTaken(s, turn, holds));
      return { turn, holds };
    },
    kept: (turn, k, release) => {
      if (k && dropped.current?.turn === turn) dropped.current = { turn, piece: k.id };
      const uri = sources.current.get(turn);
      sources.current.delete(turn);
      if (uri && release) {
        if (shownNow.current === uri) letGo.current.add(uri);
        else dropTemp(uri);
      }
      setShot((h) => shotKept(h, turn, k));
    },
  };
  return {
    view,
    editing: view.show === 'editor' ? view.capture : null,
    camera,
    open: (kept: KeptShot) => {
      if (dropped.current?.piece === kept.id) return;
      setTarget(editAfter(kept));
    },
    close: () => {
      dropped.current = { turn: turns.current, piece: null };
      setTarget(null);
      setShot(shotClosed);
    },
  };
}

/** The held shot as the editor takes it: no stored file yet, so the stage draws the shot alone (tend captures T62). */
const heldCapture = (kind: 'photo' | 'video'): Faced => facedOf({ id: '', walk_id: null, t: 0, lat: null, lon: null, kind, file_path: null, body: null, segment_id: null });

/**
 * What every screen draws after a capture: the held shot, then the editor over it, one `MediaEditor` keyed by the view,
 * so the controls come over the same shot with no remount (tend captures T62). `overlay` inside a Modal (iOS).
 */
export const AfterCaptureEditor = forwardRef<MediaEditorHandle, { view: AfterCapture; overlay?: boolean; onClose: () => void; onSave: (c: Faced, patch: CapturePatch) => Promise<void> }>(
  function AfterCaptureEditor({ view, overlay, onClose, onSave }, ref) {
    if (view.show === 'none') return null;
    const capture = view.show === 'editor' ? view.capture : heldCapture(view.shot.kind);
    return (
      <MediaEditor ref={ref} key={view.key} capture={capture} held={view.show === 'held'} shot={view.shot} overlay={overlay} justKept initialTool="crop" onClose={onClose} onSave={(patch) => onSave(capture, patch)} />
    );
  },
);
