import type { Faced } from '../../lib/moment';
import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { thumbShown } from '../../lib/thumbPlan';
import { useStill } from '../../lib/thumbs/useStill';
import { VideoMark } from '../VideoMark';

import { useMediaUri } from '../../lib/useMediaUri';
import { Icon, KIND_ICON } from '../icons';
import { theme } from '../ui';

/**
 * A moment's picture: a photo's small copy (TH4), else its file; a video's
 * still under its play mark (VT3, VT4), else its glyph; a note or a memo shows
 * its kind on a soft ground (RM18). A photo or video with no copy yet asks for
 * one (VT2). Decorative: the words around it say what it is.
 */
export function MomentPicture(props: { capture: Faced; style?: StyleProp<ViewStyle>; iconSize?: number }) {
  const { capture } = props;
  const [copyBroken, setCopyBroken] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);
  // The still to show: the row's, or one made or replaced since it was read; it asks for one it lacks (VT2).
  const row = useStill(capture);
  const ref = capture.kind === 'photo' || capture.kind === 'video' ? thumbShown(row, copyBroken) : null;
  const uri = useMediaUri(ref ? { ...capture, file_path: ref } : null);
  return (
    <View style={[styles.box, props.style]} accessible={false}>
      {uri && broken !== uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => (ref === row.thumb_path && ref !== capture.file_path && capture.kind === 'photo' ? setCopyBroken(true) : setBroken(uri))}
        />
      ) : (
        <Icon name={KIND_ICON[capture.kind]} size={props.iconSize ?? 28} color={theme.muted} />
      )}
      {capture.kind === 'video' && uri && broken !== uri ? <VideoMark style={styles.mark} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute', right: 4, bottom: 4 },
  box: { backgroundColor: '#ebe7df', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
