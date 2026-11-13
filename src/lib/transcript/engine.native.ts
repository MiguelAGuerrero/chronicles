// @layer adapter
/**
 * The phone's recognizer (decision 0166): `expo-speech-recognition` reading a saved file, on the device only
 * (`requiresOnDeviceRecognition`), with no network fallback (TX5). NEVER RUN ON A DEVICE: see
 * docs/NATIVE_UNVERIFIED.md.
 */
import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule as Speech } from 'expo-speech-recognition';
import { onDeviceReady } from './core';
import type { Engine } from './shell';

/** A read that has not ended this long after it began is given up, so a stuck recognizer never holds the queue. */
const READ_LIMIT_MS = 120_000;

export const engine: Engine = {
  async supportsOnDevice(lang) {
    try {
      const available = Speech.isRecognitionAvailable();
      const onDevice = Speech.supportsOnDeviceRecognition();
      // Only Android lists the packs that are installed; iOS lists the ones it supports, which says nothing here.
      const installed = Platform.OS === 'android' ? (await Speech.getSupportedLocales({})).installedLocales : [];
      return onDeviceReady({ os: Platform.OS, version: Number(Platform.Version) || 0, available, onDevice, installed, lang });
    } catch {
      return false;
    }
  },
  async permission() {
    const r = await Speech.getPermissionsAsync();
    return r.granted ? 'granted' : r.status === 'denied' && !r.canAskAgain ? 'denied' : 'undetermined';
  },
  async requestPermission() {
    return (await Speech.requestPermissionsAsync()).granted;
  },
  abort() {
    try {
      Speech.abort();
    } catch {
      // Already ended.
    }
  },
  recognize({ uri, lang }) {
    return new Promise<string | null>((resolve, reject) => {
      const heard: string[] = [];
      const subs: { remove(): void }[] = [];
      let timer: ReturnType<typeof setTimeout> | null = null;
      const done = (then: () => void) => {
        if (timer) clearTimeout(timer);
        for (const s of subs) s.remove();
        then();
      };
      subs.push(
        Speech.addListener('result', (e) => {
          if (e.isFinal && e.results[0]) heard.push(e.results[0].transcript);
        }),
        Speech.addListener('error', (e) => done(() => (e.error === 'no-speech' ? resolve('') : reject(new Error(e.message || e.error))))),
        // An end with no result and no error says nothing was heard at all, which is not "no speech": not recorded.
        Speech.addListener('end', () => done(() => resolve(heard.length ? heard.join(' ') : null))),
      );
      timer = setTimeout(() => {
        Speech.abort();
        done(() => reject(new Error('The read took too long.')));
      }, READ_LIMIT_MS);
      try {
        Speech.start({
          lang,
          interimResults: false,
          continuous: true,
          maxAlternatives: 1,
          addsPunctuation: true,
          requiresOnDeviceRecognition: true,
          audioSource: { uri },
        });
      } catch (e) {
        done(() => reject(e instanceof Error ? e : new Error(String(e))));
      }
    });
  },
};
