import { useEffect, useRef, useState, type ComponentRef, type ReactElement } from 'react';
import { Image, PixelRatio, Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { emptyEdit, exportPlan, type MediaEdit } from '../lib/mediaEdit';
import { CaptionBar } from './Caption';
import { EditedPicture } from './edit/EditedPhoto';
import type { BakeJob, BakeOpts, Baker } from './Baker.types';

/** Exported photos are baked at most this many pixels wide; height follows the photo. */
const BAKE_WIDTH_PX = 1600;
/** A photo that hasn't drawn by then won't. */
const LOAD_TIMEOUT_MS = 15000;

type Job = {
  id: number;
  /** Null for an overlay: the lines and caption alone, on clear. */
  uri: string | null;
  W: number;
  H: number;
  edit: MediaEdit;
  caption: string | null;
  captionY: number;
  /** Final size in pixels, and the view's size in points that renders it. */
  px: { w: number; h: number };
  dp: { w: number; h: number };
  resolve: (u: string) => void;
  reject: (e: unknown) => void;
};

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

/**
 * Bakes a photo's edits and caption into a copy, for export (ME16), or the
 * lines and caption alone into a clear PNG for a video (ME17): the same
 * `EditedPicture` the screen shows is rendered behind the screen's content
 * and captured with view-shot. The view is sized in points so the capture
 * comes out at the planned pixel size. Bakes run one at a time; the element
 * must stay mounted until they settle. Never run on a device.
 */
export function useBaker(): [ReactElement | null, Baker] {
  const [job, setJob] = useState<Job | null>(null);
  const queue = useRef<Job[]>([]);
  const ids = useRef(0);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const finish = (j: Job) => {
    queue.current = queue.current.filter((q) => q !== j);
    setJob(queue.current[0] ?? null);
  };
  useEffect(
    () => () => {
      // Closed mid-bake: nothing will draw, so say so instead of hanging.
      for (const j of queue.current) j.reject(new Error('Closed before the photo was saved.'));
      queue.current = [];
    },
    [],
  );
  const enqueue = (j: Omit<Job, 'id' | 'resolve' | 'reject' | 'dp'>) =>
    new Promise<string>((resolve, reject) => {
      const scale = PixelRatio.get();
      const full: Job = { ...j, id: ++ids.current, dp: { w: j.px.w / scale, h: j.px.h / scale }, resolve, reject };
      queue.current.push(full);
      if (queue.current.length === 1) setJob(full);
    });
  const bake: Baker['bake'] = (uri, b: BakeJob, opts: BakeOpts = {}) =>
    new Promise<{ w: number; h: number }>((resolve, reject) => Image.getSize(uri, (w, h) => resolve({ w, h }), reject)).then(({ w, h }) => {
      const edit = b.edit ?? emptyEdit();
      const plan = exportPlan({ w, h }, edit, opts.maxW || opts.maxLong ? opts : { maxW: BAKE_WIDTH_PX });
      return enqueue({ uri, W: w, H: h, edit, caption: b.caption, captionY: b.captionY ?? 0.6, px: plan.out });
    });
  const bakeOverlay: Baker['bakeOverlay'] = async (src, b, plan) => {
    const edit = b.edit ?? emptyEdit();
    if (!edit.strokes.length && !b.caption) return null;
    return enqueue({ uri: null, W: src.w, H: src.h, edit, caption: b.caption, captionY: b.captionY ?? 0.6, px: plan.out });
  };
  const capture = async (j: Job) => {
    // Two frames after the load, so the decoded photo has been drawn.
    await nextFrame();
    await nextFrame();
    captureRef(ref, {
      format: j.uri ? 'jpg' : 'png',
      quality: 0.9,
      result: 'tmpfile',
      width: j.px.w,
      height: j.px.h,
      // Draws the layer tree itself, which also works for a view the
      // window's own drawing would leave blank.
      useRenderInContext: Platform.OS === 'ios',
    })
      .then(j.resolve, j.reject)
      .finally(() => finish(j));
  };
  // An overlay has no image to wait for; a photo that never loads (the SVG
  // Image has no error event) is given up on rather than left hanging.
  const loaded = useRef<number | null>(null);
  useEffect(() => {
    if (!job) return;
    if (!job.uri) {
      void capture(job);
      return;
    }
    const t = setTimeout(() => {
      if (loaded.current === job.id) return;
      job.reject(new Error('The photo could not be loaded.'));
      finish(job);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
    // Once per job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);
  const element = job ? (
    <View
      key={job.id}
      ref={ref}
      collapsable={false}
      style={[styles.under, { width: job.dp.w, height: job.dp.h, backgroundColor: job.uri ? '#000000' : 'transparent' }]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <EditedPicture
        uri={job.uri}
        W={job.W}
        H={job.H}
        edit={job.edit}
        width={job.dp.w}
        height={job.dp.h}
        linesOnly={!job.uri}
        onLoad={() => {
          loaded.current = job.id;
          void capture(job);
        }}
      />
      {job.caption ? <CaptionBar text={job.caption} y={job.captionY} rect={{ x: 0, y: 0, width: job.dp.w, height: job.dp.h }} /> : null}
    </View>
  ) : null;
  return [element, { bake, bakeOverlay }];
}

// Behind the screen's own content: the viewer renders the baker first, so its
// opaque background covers it.
const styles = StyleSheet.create({ under: { position: 'absolute', left: 0, top: 0 } });
