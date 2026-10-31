import { useEffect, useRef, useState, type ComponentRef, type ReactElement } from 'react';
import { Image, PixelRatio, Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { CaptionBar } from './Caption';

/** Exported photos are baked at most this many pixels wide; height follows the photo. */
const BAKE_WIDTH_PX = 1600;

type Job = {
  id: number;
  uri: string;
  caption: string;
  y: number;
  /** Final size in pixels, and the view's size in points that renders it. */
  px: { w: number; h: number };
  dp: { w: number; h: number };
  resolve: (u: string) => void;
  reject: (e: unknown) => void;
};

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

/**
 * Bakes a caption into a copy of a photo, for export: the photo and its bar
 * are rendered behind the screen's content and captured with view-shot.
 * The view is sized in points so the capture comes out at the photo's own
 * pixel size (capped), not that size times the screen's scale. Bakes run one
 * at a time; the element must stay mounted until they settle.
 */
export function useBaker(): [ReactElement | null, (uri: string, caption: string, y: number) => Promise<string>] {
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
  const bake = (uri: string, caption: string, y: number) =>
    new Promise<string>((resolve, reject) => {
      Image.getSize(
        uri,
        (pw, ph) => {
          const w = Math.min(BAKE_WIDTH_PX, pw);
          const px = { w: Math.round(w), h: Math.round((ph / pw) * w) };
          const scale = PixelRatio.get();
          const j: Job = { id: ++ids.current, uri, caption, y, px, dp: { w: px.w / scale, h: px.h / scale }, resolve, reject };
          queue.current.push(j);
          if (queue.current.length === 1) setJob(j);
        },
        reject,
      );
    });
  const element = job ? (
    <View
      key={job.id}
      ref={ref}
      collapsable={false}
      style={[styles.under, { width: job.dp.w, height: job.dp.h }]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Image
        source={{ uri: job.uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        onLoad={async () => {
          const j = job;
          // Two frames after the load, so the decoded photo has been drawn.
          await nextFrame();
          await nextFrame();
          captureRef(ref, {
            format: 'jpg',
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
        }}
        onError={() => {
          job.reject(new Error('The photo could not be loaded.'));
          finish(job);
        }}
      />
      <CaptionBar text={job.caption} y={job.y} rect={{ x: 0, y: 0, width: job.dp.w, height: job.dp.h }} />
    </View>
  ) : null;
  return [element, bake];
}

// Behind the screen's own content: the viewer renders the baker first, so its
// opaque background covers it.
const styles = StyleSheet.create({ under: { position: 'absolute', left: 0, top: 0 } });
