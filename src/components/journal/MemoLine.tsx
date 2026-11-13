import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { formatElapsed } from '../../lib/format';
import { MEMO_LOAD_WAIT_MS, MEMO_PLAY_HIT, fileEnded, isRestarting, memoClockText, memoProgressText } from '../../lib/journal/memoPlay';
import { nowPlaying } from '../../lib/journal/nowPlaying';
import { facedAt, type Faced } from '../../lib/moment';
import type { Capture } from '../../lib/types';
import { useMediaUri } from '../../lib/useMediaUri';
import { useStore } from '../../lib/useStore';
import { voiceClock, voiceReachedEnd, voiceSpan, voiceState, wholeMs } from '../../lib/voiceTrim';
import { Icon } from '../icons';
import { MemoTranscript } from '../MemoTranscript';
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
const holderOf = (s: string | null) => s;

/**
 * A voice note on the journal's page, played where it sits: a play/pause button, and a bar that fills over the
 * note as it plays, with the time. It never opens the entry's viewer. The file is only resolved and loaded once
 * the note is pressed (a page holds dozens of entries). One note plays at a time, and a recording stops it
 * (`nowPlaying`). A trimmed note plays its kept part (VT6-VT8).
 */
export function MemoLine({ piece, moment }: { piece: Capture; moment: Faced }) {
  return (
    <>
      <MemoPlayer piece={piece} moment={moment} />
      <MemoTranscript piece={piece} />
    </>
  );
}

function MemoPlayer({ piece, moment }: { piece: Capture; moment: Faced }) {
  const [started, setStarted] = useState(false);
  const holder = useStore(nowPlaying.store, holderOf);
  const ms = Number(piece.body);
  const stored = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const lengthMs = voiceSpan(piece.edit?.trim, stored).lengthMs;
  // Another note, or a recording, holding the sound ends this one: its player is let go.
  const active = started && holder === piece.id;
  if (!active) {
    return (
      <Row
        playing={false}
        atMs={0}
        ofMs={lengthMs}
        onPress={() => {
          nowPlaying.claim(piece.id);
          setStarted(true);
        }}
      />
    );
  }
  return <Loaded piece={piece} moment={moment} storedMs={stored} onDone={() => setStarted(false)} />;
}

function Loaded({ piece, moment, storedMs, onDone }: { piece: Capture; moment: Faced; storedMs: number; onDone: () => void }) {
  const uri = useMediaUri(facedAt(moment, piece.id));
  const giveUp = useRef(onDone);
  useEffect(() => {
    giveUp.current = onDone;
  }, [onDone]);
  // A file that cannot be resolved must not leave a pause button that plays nothing.
  useEffect(() => {
    if (uri) return;
    const t = setTimeout(() => giveUp.current(), MEMO_LOAD_WAIT_MS);
    return () => clearTimeout(t);
  }, [uri]);
  if (!uri) return <Row playing atMs={0} ofMs={voiceSpan(piece.edit?.trim, storedMs).lengthMs} onPress={onDone} />;
  return <Playing uri={uri} piece={piece} storedMs={storedMs} />;
}

function Playing({ uri, piece, storedMs }: { uri: string; piece: Capture; storedMs: number }) {
  const trim = piece.edit?.trim ?? null;
  const player = useAudioPlayer(uri, trim ? TRIMMED_PLAYER : undefined);
  const status = useAudioPlayerStatus(player);
  const whole = wholeMs(storedMs, (status.duration || 0) * 1000);
  const span = voiceSpan(trim, whole);
  const where = voiceState(status.currentTime, span);
  // The press that restarts the kept part names the position it left: until the player moves off it, it is not the end.
  const [restartedFrom, setRestartedFrom] = useState<number | null>(null);
  const atEnd = !!trim && voiceReachedEnd(status.currentTime, span, isRestarting(status.currentTime, restartedFrom));
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
  const finished =
    status.didJustFinish ||
    (!status.playing && ((trim ? where === 'end' && !isRestarting(status.currentTime, restartedFrom) : false) || fileEnded(status.currentTime, status.duration || 0) || (!trim && whole > 0 && status.currentTime * 1000 >= whole - 100)));
  const clock = voiceClock(status.currentTime, span);
  const press = () => {
    if (status.playing) {
      pauseMemo(player);
      return;
    }
    if (finished) {
      setRestartedFrom(status.currentTime);
      seekMemo(player, span.startMs / 1000);
    }
    playMemo(player);
  };
  return <Row playing={status.playing} atMs={finished ? 0 : clock.atMs} ofMs={clock.ofMs} onPress={press} />;
}

function Row(props: { playing: boolean; atMs: number; ofMs: number; onPress: () => void }) {
  const { atMs, ofMs } = props;
  const pct = ofMs ? Math.min(100, (atMs / ofMs) * 100) : 0;
  const clock = memoClockText(atMs, ofMs);
  return (
    <View style={styles.memo} testID="entry-piece-voice">
      <Pressable
        testID="entry-voice-play"
        accessibilityRole="button"
        accessibilityLabel={props.playing ? 'Pause voice note' : `Play voice note${ofMs > 0 ? `, ${formatElapsed(ofMs)}` : ''}`}
        onPress={props.onPress}
        style={styles.hit}
      >
        <View style={styles.disc}>
          <Icon name={props.playing ? 'pause' : 'play'} size={18} color={theme.bg} />
        </View>
      </Pressable>
      <View
        style={styles.track}
        testID="entry-voice-bar"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Voice note position"
        accessibilityValue={{ min: 0, max: Math.max(1, Math.round(ofMs)), now: Math.min(Math.round(atMs), Math.max(1, Math.round(ofMs))), text: ofMs > 0 ? memoProgressText(atMs, ofMs) : undefined }}
      >
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      {clock ? <Text style={styles.time} testID="entry-voice-time">{clock}</Text> : <Text style={styles.time}>Voice note</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  memo: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: MEMO_PLAY_HIT },
  hit: { width: MEMO_PLAY_HIT, height: MEMO_PLAY_HIT, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  disc: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.edge, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: theme.ink },
  time: { color: theme.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
});
