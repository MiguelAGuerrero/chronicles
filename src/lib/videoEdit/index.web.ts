// @layer adapter
import { exportSpan, type ExportPlan, type MediaEdit } from '../mediaEdit';

/** How long a refused start (sound without a tap: Safari) may keep the export waiting. */
const START_WAIT_MS = 1500;

/** A promise, or false once `ms` have passed without it settling. */
const within = <T>(p: Promise<T>, ms: number): Promise<T | false> =>
  Promise.race([p, new Promise<false>((r) => setTimeout(() => r(false), ms))]);

/** What the browser can record, best first: MP4 where it can (Safari), WebM elsewhere. */
const TYPES = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

const once = (el: HTMLMediaElement, ev: string) =>
  new Promise<void>((resolve, reject) => {
    const ok = () => {
      el.removeEventListener('error', bad);
      resolve();
    };
    const bad = () => {
      el.removeEventListener(ev, ok);
      reject(new Error('The video could not be read.'));
    };
    el.addEventListener(ev, ok, { once: true });
    el.addEventListener('error', bad, { once: true });
  });

const loadImage = (uri: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The overlay could not be drawn.'));
    img.src = uri;
  });

/**
 * An edited video on the web (ME17): the kept part is played through a
 * canvas (turned and cropped by the plan's transform, the overlay on top)
 * and recorded with MediaRecorder, the sound taken through Web Audio so
 * nothing is heard while it records. Real time: as long as the kept part.
 * Resolves a Blob URL. No Expo module covers this on the web.
 */
export async function exportVideo(sourceUri: string, plan: ExportPlan, edit: MediaEdit, overlayUri: string | null, durationMs = 0): Promise<string> {
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser cannot make videos.');
  const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  if (!type) throw new Error('This browser cannot make videos.');
  const video = document.createElement('video');
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.src = sourceUri;
  let audio: AudioContext | null = null;
  let raf = 0;
  try {
    await once(video, 'loadedmetadata');
    // A source with no length (MediaRecorder's own WebM) ends at the capture's stored length (media-editing audit 10).
    const { startS, endS } = exportSpan(edit.trim, video.duration, durationMs);
    video.currentTime = startS;
    await once(video, 'seeked');
    const overlay = overlayUri ? await loadImage(overlayUri) : null;
    const canvas = document.createElement('canvas');
    canvas.width = plan.out.w;
    canvas.height = plan.out.h;
    const g = canvas.getContext('2d')!;
    const draw = () => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#000000';
      g.fillRect(0, 0, plan.out.w, plan.out.h);
      g.setTransform(...plan.matrix);
      g.drawImage(video, 0, 0);
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (overlay) g.drawImage(overlay, 0, 0, plan.out.w, plan.out.h);
    };
    draw();
    const stream = canvas.captureStream(30);
    // The sound: routed to a recording destination only, so it is never heard. A context the
    // browser won't start (Safari, long after the tap) is closed, never waited on (media-editing audit 4).
    try {
      audio = new AudioContext();
      const dest = audio.createMediaStreamDestination();
      audio.createMediaElementSource(video).connect(dest);
      await within(audio.resume(), START_WAIT_MS);
      if (audio.state !== 'running') throw new Error('suspended');
      for (const t of dest.stream.getAudioTracks()) stream.addTrack(t);
    } catch {
      if (audio) void audio.close().catch(() => {});
      audio = null; // a video with no sound, or a browser that won't: the picture alone
    }
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
    const parts: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const stopped = new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
    });
    rec.start(250);
    const finish = () => {
      cancelAnimationFrame(raf);
      if (rec.state !== 'inactive') rec.stop();
      video.pause();
    };
    const tick = () => {
      draw();
      if (video.currentTime >= endS - 0.01 || video.ended) finish();
      else raf = requestAnimationFrame(tick);
    };
    video.addEventListener('ended', finish, { once: true });
    // Sound refused without a tap: the picture still records, without it; a start that never
    // comes fails rather than leaving "Saving…" up (media-editing audit 4).
    const started = await within(video.play().then(() => true, () => false), START_WAIT_MS);
    if (!started) {
      video.muted = true;
      const again = await within(video.play().then(() => true, () => false), START_WAIT_MS);
      if (!again) {
        if (rec.state !== 'inactive') rec.stop();
        throw new Error('The video could not be played.');
      }
    }
    raf = requestAnimationFrame(tick);
    const limit = setTimeout(finish, (endS - startS) * 1000 + 15_000);
    await stopped;
    clearTimeout(limit);
    const blob = new Blob(parts, { type: type.split(';')[0] });
    if (!blob.size) throw new Error('The video could not be saved');
    canvas.width = 0;
    canvas.height = 0;
    return URL.createObjectURL(blob);
  } finally {
    cancelAnimationFrame(raf);
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (audio) void audio.close().catch(() => {});
  }
}
