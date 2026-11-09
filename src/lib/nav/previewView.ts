// @layer core
import type { WalkMapProps } from '../../components/map/types';

/**
 * What the live map draws while a route preview is open (fix preview-clutter): only the routes, in blue. The walked trace, the faint
 * stretches across gaps, the fog and the walked streets, the busy streets' shading, the town borders, the walkability tint and the "unwalked" veil stacked
 * under them and made the routes hard to tell apart. They come back the moment the preview closes.
 */
export type ClutterLayers = Pick<WalkMapProps, 'trace' | 'rides' | 'walked' | 'fog' | 'faint' | 'gapLinks' | 'landing' | 'borders' | 'walkability' | 'veil' | 'fogEmphasis'>;

const BLANK: ClutterLayers = { trace: [], rides: [], walked: [], fog: [], faint: [], gapLinks: [], landing: null, borders: null, walkability: null, veil: false, fogEmphasis: false };

/** The layers to draw: none of them while previewing, all of them otherwise. */
export const forPreview = (previewing: boolean, layers: ClutterLayers): ClutterLayers => (previewing ? BLANK : layers);
