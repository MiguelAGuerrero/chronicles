import { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

/**
 * The clock, read just after each whole second of the wall clock: every reader ticks at the same moment, so two figures
 * of one walk's time (the strip's and This walk's, walk-drawer-sections WD8) never stand a second apart.
 */
export function useSecondClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      t = setTimeout(tick, 1005 - (n % 1000));
    };
    t = setTimeout(tick, 1005 - (Date.now() % 1000));
    return () => clearTimeout(t);
  }, []);
  return now;
}

/** Text that updates itself every second, so its parent doesn't re-render to tick it (perf). */
export function Ticking(props: { text: (now: number) => string; style?: StyleProp<TextStyle>; label?: (now: number) => string; testID?: string; numberOfLines?: number }) {
  const now = useSecondClock();
  return (
    <Text testID={props.testID} style={props.style} numberOfLines={props.numberOfLines} accessibilityLabel={props.label?.(now)}>
      {props.text(now)}
    </Text>
  );
}
