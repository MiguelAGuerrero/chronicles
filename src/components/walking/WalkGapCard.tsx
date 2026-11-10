import type { StyleProp, ViewStyle } from 'react-native';
import { GapCard } from '../GapCard';
import { GapDraw } from '../GapDraw';
import type { WalkGaps } from './useWalkGaps';

/** A gap's card (G9, G10) in the cards' slot, and Draw my way's bar, low where the capture row was (GW3-GW8). */
export function WalkGapCard(props: { gaps: WalkGaps; covered: boolean; cardAt: StyleProp<ViewStyle>; drawBottom: number; onDraw: () => void }) {
  const { openGapOf, openGap, gapBusy, setGapOpen, decideGap, drawing, isDrawing } = props.gaps;
  return (
    <>
      {openGapOf && !isDrawing && !props.covered && (
        <GapCard
          stretch={openGap}
          gap={openGapOf}
          busy={gapBusy}
          style={props.cardAt}
          onClose={() => setGapOpen(null)}
          onKeep={() => void decideGap('kept')}
          onDismiss={() => void decideGap('dismissed')}
          onDraw={() => {
            setGapOpen(null);
            props.onDraw();
            drawing.start(openGapOf);
          }}
        />
      )}
      {/* Low, where the capture row was: big controls stay in thumb's reach (audit, UI). */}
      {isDrawing && <GapDraw drawing={drawing} style={{ bottom: props.drawBottom, zIndex: 6 }} />}
    </>
  );
}
