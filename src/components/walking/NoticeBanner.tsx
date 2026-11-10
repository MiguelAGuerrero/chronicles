import { Linking, Platform } from 'react-native';
import { Banner } from '../ui';
import type { LngLat } from '../../lib/types';
import type { Notice } from './useWalkNotice';

/** The walk's notice, with Open Settings (a phone's location refused) or Open in Maps (a route not found, NH5). */
export function NoticeBanner(props: { notice: Notice; onDismiss: () => void; onHandOff: (at: LngLat, label: string) => void }) {
  const { notice } = props;
  return (
    <Banner
      tone={notice.tone}
      onDismiss={props.onDismiss}
      action={
        notice.openSettings && Platform.OS !== 'web'
          ? { label: 'Open Settings', onPress: () => Linking.openSettings() }
          : notice.maps
            ? { label: 'Open in Maps', onPress: () => notice.maps && props.onHandOff(notice.maps.at, notice.maps.label) }
            : undefined
      }
    >
      {notice.message}
    </Banner>
  );
}
