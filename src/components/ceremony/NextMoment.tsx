import { Button } from '../ui';

/**
 * The replay's way to the next moment (replay pace RY12, decision 0203): a button in Skip's own outline, right under
 * Skip. It says "Next": the owner asked for a chevron, tested, and the cold find took the bare chevron for something
 * else and tapped Skip first, which ends the replay (Nov 18). Drawn only while a moment lies ahead (RY17); it says
 * nothing of how many are left (RY18). Both replays draw this one (RY19).
 */
export function NextMoment({ onPress }: { onPress: () => void }) {
  return <Button testID="next-moment" variant="secondary" label="Next" spokenLabel="Next moment" accessibilityHint="Goes to the next moment of the replay" onPress={onPress} />;
}
