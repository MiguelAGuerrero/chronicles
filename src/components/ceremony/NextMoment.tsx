import { Icon } from '../icons';
import { Button, theme } from '../ui';

/**
 * The replay's way to the next moment (replay pace RY12, decision 0200): a chevron in Skip's own outline, with Skip
 * in the replay's controls. Drawn only while a moment lies ahead (RY17); it says nothing of how many are left (RY18).
 * Both replays draw this one (RY19).
 */
export function NextMoment({ onPress }: { onPress: () => void }) {
  return (
    <Button testID="next-moment" variant="secondary" label="Next moment" accessibilityHint="Goes to the next moment of the replay" onPress={onPress}>
      <Icon name="chevron-forward" size={22} color={theme.ink} />
    </Button>
  );
}
