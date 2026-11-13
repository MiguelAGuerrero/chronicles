import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { formatElapsed } from '../../lib/format';
import { facedAt, type Faced } from '../../lib/moment';
import type { Capture } from '../../lib/types';
import { useMediaUri } from '../../lib/useMediaUri';
import { voiceClock, voiceReachedEnd, voiceSpan, voiceState, wholeMs } from '../../lib/voiceTrim';
import { Icon } from '../icons';
import { theme } from '../ui';

/** A trimmed memo's player reports every 100 ms, so it stops at its end handle, not up to half a second late (VT6). */
const TRIMMED_PLAYER = { updateInterval: 100 };

// Module level, so the compiler lint does not see a player mutated in a component (captures-and-media rules).
function seekMemo(player: AudioPlayer, s: number) {
  void player.seekTo(s);
}
function playMemo(player: AudioPlayer) {
  player.play();
}
function pauseMemo(player: AudioPlayer) {
  player.pause();
}

/**
 * A voice note on the journal's page, played where it sits: a play/pause button, and a bar that fills over the
 * note as it plays, with the time. A tap on it never opens the entry's viewer. The file is only resolved and
 * loaded once the note is pressed (a page holds dozens of entries). A trimmed note plays its kept part (VT6-VT8).
 */
export function MemoLine({ piece, moment }: { piece: Capture; moment: Faced }) {
  const [started, setStarted] = useState(false);
  const ms = Number(piece.body);
  const stored = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const trim = piece.edit?.trim ?? null;
  const span = voiceSpan(trim, stored);
  return started ? (
    <Loaded piece={piece} moment={moment} storedMs={stored} onDone={() => setStarted(false)} />
  ) : (
    <Row playing={false} onPress={() => setStarted(true)} atMs={0} ofMs={span.lengthMs} label={stored > 0 ? `Voice note, ${formatElapsed(span.lengthMs)}` : 'Voice note'} />
  );
}

function Loaded({ piece, moment, storedMs, onDone }: { piece: Capture; moment: Faced; storedMs: number; onDone: () => void }) {
  const uri = useMediaUri(facedAt(moment, piece.id));
  if (!uri) return <Row playing atMs={0} ofMs={voiceSpan(piece.edit?.trim, storedMs).lengthMs} label="Voice note" onPress={onDone} />;
  return <Playing uri={uri} piece={piece} storedMs={storedMs} onDone={onDone} />;
}

function Playing({ uri, piece, storedMs, onDone }: { uri: string; piece: Capture; storedMs: number; onDone: () => void }) {
  const trim = piece.edit?.trim ?? null;
  const player = useAudioPlayer(uri, trim ? TRIMMED_PLAYER : undefined);
  const status = useAudioPlayerStatus(player);
  const whole = wholeMs(storedMs, (status.duration || 0) * 1000);
  const span = voiceSpan(trim, whole);
  const where = voiceState(status.currentTime, span);
  const atEnd = !!trim && voiceReachedEnd(status.currentTime, span, false);
  // Start once, when the file has loaded: the press that made this is the tap to play.
  const began = useRef(false);
  useEffect(() => {
    if (!status.isLoaded || began.current) return;
    began.current = true;
    if (trim) seekMemo(player, trim.start_ms / 1000);
    playMemo(player);
  }, [status.isLoaded, player, trim]);
  // A trimmed note stops at its end handle; one found before its start is brought to it.
  const stopAtEnd = status.playing && atEnd;
  useEffect(() => {
    if (stopAtEnd) pauseMemo(player);
  }, [stopAtEnd, player]);
  const strayed = !!trim && status.playing && where === 'before';
  useEffect(() => {
    if (strayed) seekMemo(player, span.startMs / 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strayed, player]);
  const finished = status.didJustFinish || (!status.playing && whole > 0 && (where === 'end' || (!trim && status.currentTime * 1000 >= whole - 100)));
  const clock = voiceClock(status.currentTime, span);
  const press = () => {
    if (status.playing) pauseMemo(player);
    else if (finished) {
      seekMemo(player, span.startMs / 1000);
      playMemo(player);
    } else playMemo(player);
  };
  return <Row playing={status.playing} atMs={finished ? 0 : clock.atMs} ofMs={clock.ofMs} onPress={press} label="Voice note" />;
}

function Row(props: { playing: boolean; atMs: number; ofMs: number; label: string; onPress: () => void }) {
  const { atMs, ofMs } = props;
  const pct = ofMs ? Math.min(100, (atMs / ofMs) * 100) : 0;
  const time = ofMs > 0 ? (atMs > 0 ? `${formatElapsed(atMs)} / ${formatElapsed(ofMs)}` : formatElapsed(ofMs)) : '';
  return (
    <View style={styles.memo} testID="entry-piece-voice">
      <Pressable
        testID="entry-voice-play"
        accessibilityRole="button"
        accessibilityLabel={props.playing ? 'Pause voice note' : `Play voice note${ofMs > 0 ? `, ${formatElapsed(ofMs)}` : ''}`}
        onPress={props.onPress}
        style={styles.play}
        hitSlop={4}
      >
        <Icon name={props.playing ? 'pause' : 'play'} size={18} color="#ffffff" />
      </Pressable>
      <View style={styles.track} testID="entry-voice-bar" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      {time ? <Text style={styles.time} testID="entry-voice-time">{time}</Text> : <Text style={styles.time}>{props.label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  memo: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  play: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6b21a8', alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.line, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: '#6b21a8' },
  time: { color: theme.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
});
