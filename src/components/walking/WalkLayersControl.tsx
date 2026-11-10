import { LayersControl } from '../LayersControl';
import type { useStackLayout } from '../walk/layout';
import { layerNotes } from '../../lib/layers/notes';
import type { WalkLayers } from './useWalkLayers';

/** Layers (ML3): the bottom-left corner above the scale bar, clear of the navigation bar. */
export function WalkLayersControl(props: { layers: WalkLayers; at: ReturnType<typeof useStackLayout> }) {
  const { layers, wk, busy } = props.layers;
  const { at } = props;
  return (
    <LayersControl
      layers={layers}
      notes={layerNotes({ walkability: wk.status, busyReading: busy.reading, busyFailed: busy.failed })}
      bottom={at.layers.bottom}
      left={at.layers.left}
      rightClear={at.layersRightClear}
      clearTop={at.insets.top + 152}
    />
  );
}
