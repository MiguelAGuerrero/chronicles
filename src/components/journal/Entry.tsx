import { markOf } from '../../lib/noteType';
import { NoteMark } from '../NoteMark';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { ENTRY_GOES_ON, noteBlocks, sheetBlocks, sheetWords } from '../../lib/journal/blocks';
import { formatElapsed } from '../../lib/format';
import { dateline, entrySpoken } from '../../lib/journal/lines';
import { facedAt, hasMore } from '../../lib/moment';
import { parseRefs, plainRefs } from '../../lib/refs';
import type { ContextEntry } from '../../lib/resurface/shell';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine } from '../../lib/resurface/views';
import type { Capture, Walk } from '../../lib/types';
import { MomentPicture } from '../chronicle/MomentPicture';
import { Icon, type IconName } from '../icons';
import { NoteText } from '../threads/NoteText';
import { theme } from '../ui';
import { OWNER_FONT } from './type';

export type NoFix = 'denied' | 'timeout' | 'unavailable';

/**
 * One entry on the journal's page (chronicle journal JN3-JN7): its dateline in the app's voice, then every piece
 * in the order captured, with no card around it. The owner's words are in the serif; a memo's line, the walk it
 * came from and what it answers are the app's, in its sans. `writing` is the piece the open line holds: it is
 * drawn there, not here.
 */
export function Entry(props: {
  moment: MomentView;
  walk: Walk | undefined;
  context?: ContextEntry;
  now: number;
  reason?: NoFix | null;
  answering?: string | null;
  writing?: string | null;
  onOpen: () => void;
  /** Shows the moment on Chronicle's Map (JN6); given only for a placed one. */
  onMap?: () => void;
  onWalk: (walkId: string) => void;
  onMore: () => void;
  /** The Type slot of the note being written was tapped (note types NY19). */
  onType?: (piece: Capture) => void;
  /** The eight are open for the note being written: the slot shows it. */
  typeOpen?: boolean;
  onOpenRef: (v: MomentView) => void;
}) {
  const { moment: m, walk } = props;
  const c = m.capture;
  const placed = c.lat != null && c.lon != null;
  const line = dateline({
    t: m.t,
    now: props.now,
    placed,
    context: props.context?.state === 'done' ? { place: props.context.place, into: props.context.into } : null,
    reason: props.reason,
    // Its walk is not among the finished ones: still recording (audit 3).
    onOpenWalk: !!m.walkId && !walk,
  });
  const from = fromLine(walk);
  const pieces = c.pieces.filter((p) => p.id !== props.writing);
  // The note being written has a Type slot in the dateline's corner (note types NY19). Its mark, once chosen, is
  // drawn where a kept note's is, above its words (NY22), so Done moves nothing.
  const written = props.onType ? c.pieces.find((p) => p.id === props.writing && p.kind === 'text') : undefined;
  const mark = written ? markOf(written) : null;
  // A placed dateline wears a small pin, so it reads as the way to the map (ui 3); an unplaced one is plain words.
  const lineText = (
    <View style={styles.lineRow}>
      {placed && props.onMap ? <Icon name="location-outline" size={13} color={theme.muted} /> : null}
      <Text style={styles.app} testID="entry-dateline">{line}</Text>
    </View>
  );
  return (
    <View style={styles.entry} testID="moment-card">
      {/* The dateline's row is the entry's header: where and when, and More trailing (ui 4). */}
      <View style={styles.head}>
        {placed && props.onMap ? (
          <Pressable testID="entry-map" accessibilityRole="button" accessibilityLabel={`${line}. Show on the map`} onPress={props.onMap} style={styles.dateline}>
            {lineText}
          </Pressable>
        ) : (
          <View style={styles.dateline}>{lineText}</View>
        )}
        {written ? (
          <Pressable
            testID="type-slot"
            accessibilityRole="button"
            accessibilityLabel={`Type, ${mark?.name ?? 'No type'}`}
            aria-expanded={!!props.typeOpen}
            onPress={() => props.onType?.(written)}
            style={[styles.type, props.typeOpen && styles.typeOpen]}
          >
            <Icon name={(mark?.glyph ?? 'pricetag-outline') as IconName} size={18} color={mark || props.typeOpen ? theme.ink : theme.muted} />
          </Pressable>
        ) : null}
        <Pressable testID="moment-more" accessibilityRole="button" accessibilityLabel="More about this moment" onPress={props.onMore} style={styles.more}>
          <Icon name="ellipsis-horizontal" size={18} color={theme.muted} />
        </Pressable>
      </View>
      {pieces.length > 0 && (
        <Pressable testID="moment-open" accessibilityRole="button" accessibilityLabel={`${entrySpoken(m.kind, m.words, line, hasMore(c))}. Open`} onPress={props.onOpen} style={styles.pieces}>
          {pieces.map((p) => (
            <Piece key={p.id} piece={p} moment={m} onOpenRef={props.onOpenRef} />
          ))}
        </Pressable>
      )}
      {written && mark ? <View testID="entry-writing-type"><NoteMark capture={written} /></View> : null}
      {props.answering ? <Text style={[styles.app, styles.answering]} testID="moment-answering">{props.answering}</Text> : null}
      {from && walk ? (
        <Pressable testID="moment-walk" accessibilityRole="button" accessibilityLabel={`${from}. Replay the walk`} onPress={() => props.onWalk(walk.id)} style={styles.from}>
          <Text style={styles.app} numberOfLines={1}>{from}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Piece({ piece: p, moment: m, onOpenRef }: { piece: Capture; moment: MomentView; onOpenRef: (v: MomentView) => void }) {
  if (p.kind === 'text') {
    const body = p.body ?? '';
    if (!body.trim()) return null;
    // An entry the page wrote is drawn in its shape, natively (JN26); one it did not stays literal (NP7).
    // The type the owner chose for the note, in ink above its words (note types, decision 0161; audit 54).
    const mark = <NoteMark capture={p} />;
    if (p.body_format === 'md') return <View testID="entry-piece-text">{mark}<Blocks body={body} onOpenRef={onOpenRef} /></View>;
    // A reference is drawn as the moment it names (JN16, RF4); the words around it stay the owner's.
    return (
      <View testID="entry-piece-text">
        {mark}
        {parseRefs(body).some((x) => 'ref' in x) ? (
          <View testID="entry-words"><NoteText body={body} style={styles.words} onOpen={onOpenRef} /></View>
        ) : (
          <Plain body={body} />
        )}
      </View>
    );
  }
  if (p.kind === 'voice') {
    const ms = Number(p.body);
    return (
      <View style={styles.memo} testID="entry-piece-voice">
        {/* A mic, not a play button: the row opens the entry, where the note plays (ui 2). */}
        <Icon name="mic-outline" size={20} color={theme.ink} />
        <Text style={styles.memoText}>{Number.isFinite(ms) && ms > 0 ? `Voice note, ${formatElapsed(ms)}` : 'Voice note'}</Text>
      </View>
    );
  }
  return (
    <View testID={`entry-piece-${p.kind}`} style={styles.plate}>
      <MomentPicture capture={facedAt(m.capture, p.id)} style={styles.picture} iconSize={36} />
      {p.caption?.trim() ? <Text style={styles.words} testID="entry-words">{p.caption.trim()}</Text> : null}
    </View>
  );
}

const LISTED = new Set(['bullet', 'number', 'task']);

/** A plain entry's words: whole when short, cut at a word with a line that says so when long (JN27, audit 3). */
function Plain({ body }: { body: string }) {
  const cut = sheetWords(body);
  if (!cut.more) return <Text style={styles.words} testID="entry-words">{body}</Text>;
  return (
    <View testID="entry-words" style={styles.blocks}>
      <Text style={styles.words}>{cut.text}</Text>
      <Text style={styles.app} testID="entry-goes-on">{ENTRY_GOES_ON}</Text>
    </View>
  );
}

/** A block's words, with each mention as that moment's card. */
function Words(props: { text: string; style: StyleProp<TextStyle>; onOpenRef: (v: MomentView) => void }) {
  if (parseRefs(props.text).some((x) => 'ref' in x)) return <View style={styles.grow}><NoteText body={props.text} style={props.style} onOpen={props.onOpenRef} /></View>;
  return <Text style={[props.style, styles.grow]}>{props.text}</Text>;
}

/**
 * A page-written note on the sheet (JN26, JN27): headings, bullets, numbered lines, checkboxes and quotes as plain
 * text in the owner's serif. Never the editor: it is a web view on a phone, and a sheet holds dozens of entries. A
 * checkbox is shown ticked or not and is ticked in its page; nothing counts them.
 */
function Blocks({ body, onOpenRef }: { body: string; onOpenRef: (v: MomentView) => void }) {
  const { shown, more } = sheetBlocks(noteBlocks(body));
  return (
    <View testID="entry-words" style={styles.blocks}>
      {shown.map((b, i) => {
        // Lines of one list sit closer than paragraphs do (ui 6).
        const tight = i > 0 && LISTED.has(b.k) && shown[i - 1].k === b.k ? styles.tight : null;
        if (b.k === 'heading') return <View key={i} testID="entry-block-heading" accessibilityRole="header"><Words text={b.text} style={[styles.words, b.level === 1 ? styles.h1 : styles.h2]} onOpenRef={onOpenRef} /></View>;
        if (b.k === 'para') return <View key={i} testID="entry-block-para"><Words text={b.text} style={styles.words} onOpenRef={onOpenRef} /></View>;
        if (b.k === 'quote') return <View key={i} testID="entry-block-quote" style={styles.quote}><Words text={b.text} style={[styles.words, styles.quoted]} onOpenRef={onOpenRef} /></View>;
        if (b.k === 'task') {
          return (
            <View key={i} testID="entry-block-task" style={[styles.item, tight]} accessible accessibilityRole="checkbox" aria-checked={b.done} aria-disabled accessibilityLabel={plainRefs(b.text)}>
              <View style={styles.box}>{/* Muted: on the sheet a box is read, and ticked in its page (ui 7). */}
                <Icon name={b.done ? 'checkbox-outline' : 'square-outline'} size={20} color={theme.muted} /></View>
              <Words text={b.text} style={styles.words} onOpenRef={onOpenRef} />
            </View>
          );
        }
        return (
          <View key={i} testID={`entry-block-${b.k}`} style={[styles.item, tight]}>
            <Text style={[styles.words, styles.mark]}>{b.k === 'number' ? `${b.n}.` : '•'}</Text>
            <Words text={b.text} style={styles.words} onOpenRef={onOpenRef} />
          </View>
        );
      })}
      {more ? <Text style={styles.app} testID="entry-goes-on">{ENTRY_GOES_ON}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: 8 },
  tight: { marginTop: -5 },
  grow: { flex: 1 },
  h1: { fontSize: 23, lineHeight: 30, fontWeight: '600' },
  h2: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  mark: { minWidth: 20 },
  box: { width: 20, height: 28, alignItems: 'center', justifyContent: 'center' },
  quote: { paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: theme.edge },
  quoted: { fontStyle: 'italic' },
  entry: { paddingBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-end' },
  // A thumb's target for the map (JN6), and the breath between entries.
  dateline: { flex: 1, minHeight: 44, justifyContent: 'flex-end', paddingBottom: 6 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  app: { color: theme.muted, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  answering: { paddingTop: 8 },
  pieces: { gap: 10 },
  words: { color: theme.ink, fontFamily: OWNER_FONT, fontSize: 19, lineHeight: 28 },
  plate: { gap: 8 },
  picture: { height: 200, width: '100%' },
  memo: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  memoText: { color: theme.ink, fontSize: 15 },
  from: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  type: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  typeOpen: { backgroundColor: '#ebe7df' },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
});
