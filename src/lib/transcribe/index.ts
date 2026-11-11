// @layer shell
// @instance: memo transcripts, built from the app's ports and the platform's engine
import { AppState } from 'react-native';
import { ports } from '../ports';
import { decoder, engine, files } from './engines';
import { createModelStore } from './model';
import { onMemoKept } from './nudge';
import { createTranscriber } from './run';
import { createWords } from './words';

/**
 * The app's memo transcripts (MX1-MX32): the words by piece id (read by the viewer, the resurface seam and the thread
 * rows, MX24), the model's life behind the switch (MX10-MX15) and the run. Importing this starts nothing heavy: it
 * looks at the switch and the file, and a run only loads the engine when one is allowed and due (MX16, MX17).
 */
export const words = createWords(ports);
export const model = createModelStore(ports, { engine, files });
export const transcriber = createTranscriber(ports, {
  engine,
  decoder,
  model: () => ({ on: model.store.get().on, ref: model.installedModel()?.ref ?? null }),
  env: { isForeground: () => AppState.currentState === 'active', isRecording: () => ports.recorder.isRecording() },
  onStored: () => void words.load(),
});

let started = false;
/** Looks at the switch and the model, reads the stored words, and arranges for a run when one may start. Once. */
export function start() {
  if (started) return;
  started = true;
  const run = () => void transcriber.run();
  void model.init().then(() => {
    void words.load();
    run();
  });
  AppState.addEventListener('change', (s) => (s === 'active' ? run() : void transcriber.onBackground()));
  AppState.addEventListener('memoryWarning', () => void transcriber.onMemoryWarning());
  ports.recorder.subscribeStatus((s) => s.kind === 'idle' && run());
  onMemoKept(run);
  // The switch turned on, or the model just installed: read what is waiting.
  let was = model.store.get().on && model.store.get().installed;
  model.store.subscribe(() => {
    const now = model.store.get().on && model.store.get().installed;
    if (now && !was) run();
    was = now;
  });
}

start();
