// @layer view
import { useCallback, useEffect, useState } from 'react';
import type { GazetteerIndex } from './search';
import { bundledGazetteer, indexOf, type GazetteerSource } from './source';

export type PlaceIndex = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; index: GazetteerIndex };

/**
 * The gazetteer's lookup for the search sheet (GZ15): read the first time the sheet opens, never at launch. It holds no text and
 * writes nothing (GZ16): the sheet owns the field.
 */
export function usePlaceSearch(source: GazetteerSource = bundledGazetteer): { state: PlaceIndex; retry: () => void } {
  const [state, setState] = useState<PlaceIndex>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    indexOf(source).then(
      (index) => live && setState({ status: 'ready', index }),
      () => live && setState({ status: 'failed' }),
    );
    return () => {
      live = false;
    };
  }, [source, attempt]);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((a) => a + 1);
  }, []);
  return { state, retry };
}
