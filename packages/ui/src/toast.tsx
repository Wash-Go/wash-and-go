import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from './theme';

// One toast system for every app screen. Success = green, error = red, info =
// navy. Replaces all the ad-hoc inline red error text. Auto-dismisses; tap to
// close early.
export type ToastType = 'success' | 'error' | 'info';

type ToastState = { message: string; type: ToastType } | null;

const ToastCtx = createContext<{ show: (m: string, t?: ToastType) => void }>({
  show: () => {},
});

export function useToast() {
  const { show } = useContext(ToastCtx);
  return {
    show,
    success: (m: string) => show(m, 'success'),
    error: (m: string) => show(m, 'error'),
    info: (m: string) => show(m, 'info'),
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [anim]);

  const show = useCallback(
    (message: string, type: ToastType = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, type });
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 7,
        speed: 14,
      }).start();
      timer.current = setTimeout(hide, 3400);
    },
    [anim, hide],
  );

  const bg =
    toast?.type === 'success'
      ? colors.success
      : toast?.type === 'error'
        ? colors.danger
        : colors.navy;
  const icon = toast?.type === 'success' ? '✓' : toast?.type === 'error' ? '!' : 'i';

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              top: insets.top + 8,
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
              ],
            },
          ]}
        >
          <Pressable onPress={hide} style={[styles.toast, { backgroundColor: bg }]}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.msg} numberOfLines={3}>
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 480,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  icon: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    width: 18,
    textAlign: 'center',
  },
  msg: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1,
    fontFamily: font.regular,
  },
});
