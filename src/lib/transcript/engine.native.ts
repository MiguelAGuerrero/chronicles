// @layer adapter
/**
 * The phone's recognizer (decision 0165): `expo-speech-recognition` reading a saved file, on the device only
 * (`requiresOnDeviceRecognition`), with no network fallback (TX5). NEVER RUN ON A DEVICE: see
 * docs/NATIVE_UNVERIFIED.md.
 */
import { ExpoSpeechRecognitionModule as Speech } from 'expo-speech-recognition';
import type { Engine } from './shell';

/** A read that has not ended this long after it began is given up, so a stuck recognizer never holds the queue. */
const READ_LIMIT_MS = 120_000;

const sameLang = (a: string, b: string) => a.toLowerCase().replace('_', '-') === b.toLowerCase().replace('_', '-');

export const engine: Engine = {
  async supportsOnDevice(lang) {
    try {
      if (!Speech.isRecognitionAvailable() || !Speech.supportsOnDeviceRecognition()) return false;
      const { locales, installedLocales } = await Speech.getSupportedLocales({});
      if (installedLocales.length) return installedLocales.some((l) => sameLang(l, lang));
      return !locales.length || locales.some((l) => sameLang(l, lang));
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
  recognize({ uri, lang }) {
    return new Promise<string>((resolve, reject) => {
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
        Speech.addListener('end', () => done(() => resolve(heard.join(' ')))),
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
