import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clampSlide, createSlideGate, slideTravel } from './slide-gate';
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
  refreshing,
  onRefresh,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  // Pull-to-refresh, scrolling screens only: pass onRefresh plus refreshing
  // (true while the reload runs). Omitted = no pull-to-refresh.
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.brand}
                colors={[colors.brand]}
              />
            ) : undefined
          }
          // persistTaps keeps buttons tappable while the keyboard is up;
          // on-drag dismisses the keyboard when you start scrolling.
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        // Non-scroll screens (e.g. login): tap any empty area to dismiss the
        // keyboard. Buttons/inputs handle their own touch, so only background
        // taps reach this handler.
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.body}>{children}</View>
        </TouchableWithoutFeedback>
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
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'navy' | 'terra';
  testID?: string;
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
      testID={testID}
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
//
// Pass `loading` while the confirmed request is in flight: the control locks
// (no drag, no second fire), the thumb stays at the end with a spinner, and it
// springs back once `loading` goes false again (success or error). The slide
// always calls the latest `onConfirm`, and screen readers can confirm it with
// the standard activate (double-tap) action. Decision logic: ./slide-gate.ts.
export function SlideToConfirm({
  label,
  onConfirm,
  loading,
  color = colors.brand,
}: {
  label: string;
  onConfirm: () => void;
  loading?: boolean;
  color?: string;
}) {
  const THUMB = 56;
  const widthRef = useRef(0);
  const x = useRef(new Animated.Value(0)).current;
  const gate = useRef(createSlideGate()).current;
  // Re-synced every render: the PanResponder below is created once, so it must
  // read props through the gate, never through its own closure.
  gate.sync({ onConfirm, loading: !!loading });
  // Mirrors the gate's "fired" phase so the settle effect re-runs.
  const [held, setHeld] = useState(false);

  const travel = () => slideTravel(widthRef.current, THUMB, 8);
  const springBack = () =>
    Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
  const complete = () =>
    Animated.timing(x, {
      toValue: travel(),
      duration: 90,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        gate.abort();
        springBack();
        return;
      }
      // Queue the hold first: if onConfirm throws, the settle effect still
      // runs and unlocks the control instead of leaving it dead.
      setHeld(true);
      gate.fire();
    });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => gate.canDrag(),
      onMoveShouldSetPanResponder: () => gate.canDrag(),
      onPanResponderMove: (_e, g) => {
        x.setValue(clampSlide(g.dx, travel()));
      },
      onPanResponderRelease: (_e, g) => {
        if (gate.tryCommit(g.dx, travel())) complete();
        else springBack();
      },
      // A parent ScrollView (or the OS) took the gesture: never leave the
      // thumb stranded mid-track.
      onPanResponderTerminate: springBack,
    }),
  ).current;

  // Hold the thumb at the end until the parent is no longer loading.
  useEffect(() => {
    if (held && gate.settle()) {
      setHeld(false);
      springBack();
    }
    // gate, x (via springBack) and setHeld never change for this mount.
  }, [held, loading]);

  const locked = !!loading || held;
  return (
    <View
      style={[styles.slideTrack, { backgroundColor: color + '1c' }]}
      onLayout={(e) => (widthRef.current = e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: locked, busy: !!loading }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate' && gate.activate()) complete();
      }}
    >
      <Text style={[styles.slideLabel, { color }]}>{label}</Text>
      <Animated.View
        {...pan.panHandlers}
        style={[styles.slideThumb, { backgroundColor: color, transform: [{ translateX: x }] }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.slideThumbText}>→</Text>
        )}
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
  retryLabel = 'Try again',
}: {
  message: string;
  onRetry?: () => void;
  // For an error a retry can't fix (e.g. out of the service area), name the
  // action that can. Defaults to "Try again", so existing callers are unchanged.
  retryLabel?: string;
}) {
  return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 40, marginBottom: space.sm }}>⚠️</Text>
      <Text style={[type.body, { color: colors.text, textAlign: 'center' }]}>
        {message}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: space.lg, alignSelf: 'stretch' }}>
          <PrimaryButton label={retryLabel} onPress={onRetry} />
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
