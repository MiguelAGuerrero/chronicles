// @layer adapter
/**
 * The note page's document (NP3, NP7, decision 0149): TipTap's extensions, and the Markdown a note's body holds,
 * through `@tiptap/markdown`. A mention is `@[id|words]` (0125). A note without the mark (`body_format` null,
 * every note written before) is read literally: its lines become paragraphs of plain text.
 */
import type { AnyExtension, JSONContent } from '@tiptap/core';

export type BodyFormat = 'md' | null;

/** The extensions the document is made of (the editor adds its own on top: placeholder, input rules' Markdown). */
export function noteExtensions(): AnyExtension[] {
  throw new Error('note pages: not built');
}

/** A body as the editor's document. */
export function toDoc(_body: string, _format: BodyFormat): JSONContent {
  throw new Error('note pages: not built');
}

/** The editor's document as the body it is kept as (always Markdown). */
export function toBody(_doc: JSONContent): string {
  throw new Error('note pages: not built');
}
