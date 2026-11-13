import type { Faced } from '../../lib/moment';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { thumbShown, wantsThumb } from '../../lib/thumbPlan';
import { thumbs } from '../../lib/thumbs';
import { useStore } from '../../lib/useStore';
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
  // A copy made since this card read its row (VT2), else the row's own.
  const made = useStore(thumbs.store, (st) => st.made[capture.piece_id]);
  const row = made ? { ...capture, thumb_path: made } : capture;
  const ref = capture.kind === 'photo' || capture.kind === 'video' ? thumbShown(row, copyBroken) : null;
  const wants = !made && wantsThumb(capture);
  useEffect(() => {
    if (wants) void thumbs.ask(capture.id, capture.piece_id);
  }, [wants, capture.id, capture.piece_id]);
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
