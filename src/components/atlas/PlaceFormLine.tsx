import type { StyleProp, TextStyle } from 'react-native';
import { Text } from 'react-native';
import { cardLine, type FormWord } from '../../lib/walk/placeForm';

/**
 * The one line that says how the ground around an area's middle is laid out (specs/place-form PF12): text only, no icon, no colour of its own, no control, and
 * nothing when there is no word. It is the only component that takes the word (PF13, PF20); its style is the card's.
 */
export function PlaceFormLine({ form, style }: { form: FormWord | null; style: StyleProp<TextStyle> }) {
  if (!form) return null;
  return (
    <Text style={style} testID="atlas-place-form">
      {cardLine(form)}
    </Text>
  );
}
