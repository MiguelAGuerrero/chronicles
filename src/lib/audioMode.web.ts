import type { AudioMode } from './audioMode.types';

type AudioSessionType = 'auto' | 'playback' | 'play-and-record' | 'ambient';

/**
 * Sets the app's audio mode on the web. expo-audio's web setAudioModeAsync
 * does nothing, so a page never asked to play with the ringer switch off, and
 * iPhone browsers (Safari's engine, Edge and Chrome included) played memos and
 * videos silently. The Audio Session API (Safari 16.4+) is the web's
 * equivalent: 'playback' plays in silent mode; 'play-and-record' while a memo
 * records. Where the API is missing (desktop browsers) there is nothing to set.
 */
export async function setAudioMode(mode: AudioMode): Promise<void> {
  const session = (typeof navigator !== 'undefined' ? (navigator as Navigator & { audioSession?: { type: AudioSessionType } }).audioSession : undefined);
  if (!session) return;
  session.type = mode.allowsRecording ? 'play-and-record' : mode.playsInSilentMode ? 'playback' : 'auto';
}
