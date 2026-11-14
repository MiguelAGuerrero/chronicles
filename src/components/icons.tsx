import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { CaptureKind } from '../lib/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon(props: { name: IconName; size?: number; color: string; testID?: string }) {
  return <Ionicons name={props.name} size={props.size ?? 24} color={props.color} accessible={false} testID={props.testID} />;
}

export const KIND_ICON: Record<CaptureKind | 'mixed', IconName> = {
  photo: 'camera',
  video: 'videocam',
  voice: 'mic',
  text: 'create',
  mixed: 'images',
};

export const KIND_LABEL: Record<CaptureKind, string> = {
  photo: 'Photo',
  video: 'Video',
  voice: 'Voice memo',
  text: 'Note',
};

/** The glyph a capture wears where its kind's icon is drawn: always its kind's (RX18); a reaction is never the head. */
export function captureIcon(c: { kind: CaptureKind }): IconName {
  return KIND_ICON[c.kind];
}
