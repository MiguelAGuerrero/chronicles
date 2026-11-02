import { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

/** Text that updates itself every second, so its parent doesn't re-render to tick it (perf). */
export function Ticking(props: { text: (now: number) => string; style?: StyleProp<TextStyle>; label?: (now: number) => string; testID?: string; numberOfLines?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <Text testID={props.testID} style={props.style} numberOfLines={props.numberOfLines} accessibilityLabel={props.label?.(now)}>
      {props.text(now)}
    </Text>
  );
}
