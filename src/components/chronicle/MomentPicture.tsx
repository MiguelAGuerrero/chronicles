import type { Faced } from '../../lib/moment';
import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { thumbShown } from '../../lib/thumbPlan';

import { useMediaUri } from '../../lib/useMediaUri';
import { Icon, KIND_ICON } from '../icons';
import { theme } from '../ui';

/**
 * A moment's picture: a photo's small copy (TH4), else its file; a note, a
 * memo or a video shows its kind on a soft ground (RM18). Decorative: the
 * words around it say what it is.
 */
export function MomentPicture(props: { capture: Faced; style?: StyleProp<ViewStyle>; iconSize?: number }) {
  const { capture } = props;
  const [copyBroken, setCopyBroken] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);
  const ref = capture.kind === 'photo' ? thumbShown(capture, copyBroken) : null;
  const uri = useMediaUri(ref ? { ...capture, file_path: ref } : null);
  return (
    <View style={[styles.box, props.style]} accessible={false}>
      {uri && broken !== uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => (ref === capture.thumb_path && ref !== capture.file_path ? setCopyBroken(true) : setBroken(uri))}
        />
      ) : (
        <Icon name={KIND_ICON[capture.kind]} size={props.iconSize ?? 28} color={theme.muted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#ebe7df', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
