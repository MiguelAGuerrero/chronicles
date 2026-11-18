// @layer view
import { useCallback } from 'react';
import { isStale, wordsOfRow, type MemoRef } from './transcript/core';
import { transcripts } from './transcript';
import { useStore } from './useStore';

/**
 * A memo's words once the phone has read them, else null (TX7, TX9): none while pending, empty, or read from another
 * span than the memo keeps now (TX13). A row is a stable object, so the selector hands back the same one until it changes.
 */
export function useTranscript(memo: MemoRef): string | null {
  const id = memo.id;
  const row = useStore(transcripts.store, useCallback((m) => m.get(id), [id]));
  return row && !isStale(row, memo) ? wordsOfRow(row) : null;
}
