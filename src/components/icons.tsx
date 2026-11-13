import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { markOf } from '../lib/noteType';
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

/**
 * The glyph a capture wears where its kind's icon is drawn (NY3, NY10): a note's type glyph when it has one, else its
 * kind's icon. Only a note takes a type's glyph.
 */
export function captureIcon(c: { kind: CaptureKind; note_type?: string | null }): IconName {
  const m = markOf(c);
  return m ? (m.glyph as IconName) : KIND_ICON[c.kind];
}
