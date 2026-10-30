import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export const theme = {
  bg: '#f4f2ee',
  surface: '#ffffff',
  ink: '#1d2430',
  muted: '#667085',
  line: '#e3e0da',
  accent: '#ff6a2b',
  accentInk: '#ffffff',
  danger: '#c0392b',
  radius: 14,
};

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button(props: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: string;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const v = props.variant ?? 'primary';
  const fg = v === 'primary' || v === 'danger' ? theme.accentInk : theme.ink;
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      disabled={props.disabled || props.busy}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.btn,
        styles[v],
        (props.disabled || props.busy) && styles.disabled,
        pressed && styles.pressed,
        props.style,
      ]}
    >
      {props.busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, { color: fg }]}>
          {props.icon ? `${props.icon}  ` : ''}
          {props.label}
        </Text>
      )}
    </Pressable>
  );
}

export function Banner({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  return (
    <View style={[styles.banner, tone === 'error' && styles.bannerError]}>
      <Text style={[styles.bannerText, tone === 'error' && { color: theme.danger }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: theme.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.accent },
  secondary: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
  danger: { backgroundColor: theme.ink },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  label: { fontSize: 16, fontWeight: '600' },
  banner: {
    backgroundColor: '#fff7e6',
    borderColor: '#f5d9a8',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bannerError: { backgroundColor: '#fdecea', borderColor: '#f5c6c0' },
  bannerText: { color: '#7a5200', fontSize: 13, lineHeight: 18 },
});
