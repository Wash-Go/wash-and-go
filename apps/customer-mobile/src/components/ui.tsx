import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '../lib/theme';

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
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {content}
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      style={[styles.btn, off && styles.btnOff]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.btnText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={[type.h1, { color: colors.text }]}>{children}</Text>;
}
export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={[type.small, { color: colors.textMuted }]}>{children}</Text>;
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
    <View style={[styles.pill, { backgroundColor: color + '1A' }]}>
      <Text style={[type.small, { color, fontWeight: '600' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollBody: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  body: { flex: 1, padding: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  pressed: { opacity: 0.7 },
  btn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  btnOff: { backgroundColor: colors.border },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  centered: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
