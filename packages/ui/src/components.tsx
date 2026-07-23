import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, elevation, font, radius, space, type } from './theme';

// Spring-scale on press — gives buttons/cards physical weight (haptic feel).
function usePressScale(to = 0.97) {
  const s = useRef(new Animated.Value(1)).current;
  const spring = (v: number) =>
    Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return {
    scale: s,
    onPressIn: () => spring(to),
    onPressOut: () => spring(1),
  };
}

export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  testID?: string;
}) {
  const press = usePressScale(0.985);
  if (!onPress) {
    return (
      <View style={[styles.card, style]} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      testID={testID}
    >
      <Animated.View style={[styles.card, style, { transform: [{ scale: press.scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  tone = 'navy',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'navy' | 'terra';
}) {
  const off = disabled || loading;
  const press = usePressScale(0.96);
  const shadow = off ? undefined : tone === 'terra' ? elevation.terra : elevation.hero;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
    >
      <Animated.View
        style={[
          styles.btn,
          tone === 'terra' && styles.btnTerra,
          off && styles.btnOff,
          shadow,
          { transform: [{ scale: press.scale }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.btnText, off && { color: colors.textFaint }]}>{label}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// Slide-to-confirm for irreversible / money actions (rider design D2). Uses the
// built-in PanResponder + Animated — no native module, Expo Go safe.
export function SlideToConfirm({
  label,
  onConfirm,
  color = colors.brand,
}: {
  label: string;
  onConfirm: () => void;
  color?: string;
}) {
  const THUMB = 56;
  const widthRef = useRef(0);
  const x = useRef(new Animated.Value(0)).current;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_e, g) => {
        const max = Math.max(0, widthRef.current - THUMB - 8);
        x.setValue(Math.min(Math.max(0, g.dx), max));
      },
      onPanResponderRelease: (_e, g) => {
        const max = Math.max(0, widthRef.current - THUMB - 8);
        if (max > 0 && g.dx >= max * 0.9) {
          Animated.timing(x, {
            toValue: max,
            duration: 90,
            useNativeDriver: false,
          }).start(() => {
            onConfirm();
            x.setValue(0);
          });
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    }),
  ).current;

  return (
    <View
      style={[styles.slideTrack, { backgroundColor: color + '1c' }]}
      onLayout={(e) => (widthRef.current = e.nativeEvent.layout.width)}
    >
      <Text style={[styles.slideLabel, { color }]}>{label}</Text>
      <Animated.View
        {...pan.panHandlers}
        style={[styles.slideThumb, { backgroundColor: color, transform: [{ translateX: x }] }]}
      >
        <Text style={styles.slideThumbText}>→</Text>
      </Animated.View>
    </View>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={[type.h1, { color: colors.text }]}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={[type.h2, { color: colors.text }]}>{children}</Text>;
}
export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={[type.small, { color: colors.textMuted }]}>{children}</Text>;
}

// Small uppercase section label (eyebrow).
export function Eyebrow({ children, color = colors.terraDark }: { children: React.ReactNode; color?: string }) {
  return <Text style={[type.label, { color, textTransform: 'uppercase' }]}>{children}</Text>;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={[type.body, { color: colors.textMuted, marginTop: space.md }]}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  emoji,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 44, marginBottom: space.sm }}>{emoji}</Text>
      <Text style={[type.h2, { color: colors.text, textAlign: 'center' }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            type.body,
            { color: colors.textMuted, textAlign: 'center', marginTop: space.xs },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: space.lg, alignSelf: 'stretch' }}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 40, marginBottom: space.sm }}>⚠️</Text>
      <Text style={[type.body, { color: colors.text, textAlign: 'center' }]}>
        {message}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: space.lg, alignSelf: 'stretch' }}>
          <PrimaryButton label="Try again" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '18' }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[type.small, { color, fontFamily: font.bold }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollBody: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  body: { flex: 1, padding: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
    padding: space.lg,
    gap: space.sm,
    ...elevation.card,
  },
  btn: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  btnTerra: { backgroundColor: colors.terra },
  btnOff: { backgroundColor: colors.border },
  btnText: { color: '#fff', fontSize: 16, fontFamily: font.bold, letterSpacing: -0.2 },
  slideTrack: {
    height: 64,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  slideLabel: { textAlign: 'center', fontSize: 16, fontFamily: font.bold },
  slideThumb: {
    position: 'absolute',
    left: 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.soft,
  },
  slideThumbText: { color: '#fff', fontSize: 24, fontFamily: font.extrabold },
  centered: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
});
