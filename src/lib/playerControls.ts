// @layer core
// The audio player's controls, one copy for every screen that plays a memo (CaptureView, MemoLine, the replay's
// bubbles, the media editor). Module level, so the compiler lint does not see a player mutated in a component
// (captures-and-media rules); core, since it only calls what it is given.
import type { AudioPlayer } from 'expo-audio';

type Player = Pick<AudioPlayer, 'seekTo' | 'play' | 'pause'>;

export function seekPlayer(player: Player, s: number) {
  void player.seekTo(s);
}
export function playPlayer(player: Player) {
  player.play();
}
export function pausePlayer(player: Player) {
  player.pause();
}
