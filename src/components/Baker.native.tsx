import { useRef, useState, type ComponentRef, type ReactElement } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { CaptionBar } from './Caption';

/** Exported photos are baked at this width; height follows the photo. */
const BAKE_WIDTH = 1600;

type Job = { uri: string; caption: string; y: number; w: number; h: number; resolve: (u: string) => void; reject: (e: unknown) => void };

/**
 * Bakes a caption into a copy of a photo, for export: the photo and its bar
 * are rendered off screen at full size and captured with view-shot. The
 * element must be mounted for it to work.
 */
export function useBaker(): [ReactElement | null, (uri: string, caption: string, y: number) => Promise<string>] {
  const [job, setJob] = useState<Job | null>(null);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const bake = (uri: string, caption: string, y: number) =>
    new Promise<string>((resolve, reject) => {
      Image.getSize(
        uri,
        (pw, ph) => {
          const w = Math.min(BAKE_WIDTH, pw);
          setJob({ uri, caption, y, w, h: (ph / pw) * w, resolve, reject });
        },
        reject,
      );
    });
  const element = job ? (
    <View ref={ref} collapsable={false} style={[styles.off, { width: job.w, height: job.h }]} pointerEvents="none">
      <Image
        source={{ uri: job.uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        onLoad={() => {
          // Once the photo has drawn, capture the view with its caption.
          requestAnimationFrame(() => {
            const j = job;
            captureRef(ref, { format: 'jpg', quality: 0.9, result: 'tmpfile' })
              .then(j.resolve, j.reject)
              .finally(() => setJob(null));
          });
        }}
        onError={() => {
          job.reject(new Error('The photo could not be loaded.'));
          setJob(null);
        }}
      />
      <CaptionBar text={job.caption} y={job.y} rect={{ x: 0, y: 0, width: job.w, height: job.h }} />
    </View>
  ) : null;
  return [element, bake];
}

const styles = StyleSheet.create({ off: { position: 'absolute', left: -10000, top: 0 } });
