import { CaptureViewer } from '../CaptureView';
import { MediaEditor } from '../edit/MediaEditor';
import { KIND_LABEL } from '../icons';
import type { Cards } from './useCards';
import type { Recall } from './useRecall';
import type { WalkCaptures } from './useWalkCaptures';
import type { WalkMemories } from './useWalkMemories';
import type { WalkNavigation } from './useWalkNavigation';

/** The capture viewer for a pin or a reminder (R4), and the media editor from the Edit pill (ME23). */
export function WalkViewer(props: {
  cards: Cards;
  captures: WalkCaptures;
  recall: Recall;
  walkId: string | null;
  nav: WalkNavigation;
}) {
  const { navigation, goTo, handOff } = props.nav;
  const { viewing, setViewing } = props.cards;
  const { cap, captures, editingKept, setEditingKept } = props.captures;
  return (
    <>
      <CaptureViewer
        key={viewing?.[0]?.id ?? 'none'}
        captures={viewing && viewing.map((v) => captures.find((c) => c.id === v.id) ?? v)}
        onClose={() => {
          setViewing(null);
          props.recall.setAutoPlay(false);
        }}
        autoPlay={props.recall.autoPlay}
        remind
        walkId={props.walkId}
        onSaveEdit={(c, patch) => cap.setEdit(c, patch)}
        onSaveNote={(c, body) => cap.setNote(c, body)}
        onGoHere={navigation.finding ? undefined : (c) => {
          setViewing(null);
          if (c.lat != null && c.lon != null) goTo({ at: [c.lon, c.lat], label: KIND_LABEL[c.kind], kind: 'capture' });
        }}
        onOpenInMaps={(c) => {
          if (c.lat != null && c.lon != null) handOff([c.lon, c.lat], KIND_LABEL[c.kind]);
        }}
      />
      {editingKept && (
        <MediaEditor key={editingKept.id} capture={editingKept} initialTool="crop" onClose={() => setEditingKept(null)} onSave={(patch) => cap.setEdit(editingKept, patch)} />
      )}
    </>
  );
}

/** Memories here (from a memory's preview) and What happened here (from the spot card). */
export function HereViewers(props: { cards: Cards; mem: WalkMemories; captures: WalkCaptures; walkId: string | null }) {
  const { whatHere, setWhatHere, hereKey } = props.cards;
  const { memoryView, setMemoryView } = props.mem;
  return (
    <>
      <CaptureViewer
        title="Memories here"
        remind
        walkId={props.walkId}
        captures={memoryView?.captures ?? null}
        context={memoryView?.context}
        onClose={() => setMemoryView(null)}
      />
      <CaptureViewer
        key={`here:${hereKey}`}
        title="What happened here"
        remind
        walkId={props.walkId}
        captures={whatHere?.captures ?? null}
        context={whatHere?.context}
        onClose={() => setWhatHere(null)}
        onSaveNote={(c, body) => props.captures.cap.setNote(c, body)}
      />
    </>
  );
}
