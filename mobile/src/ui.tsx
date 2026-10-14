import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { avatarColor, initial } from './ledger';
import { font, useTheme } from './theme';

type W = keyof typeof font;

export function T({ w = 'regular', style, ...p }: TextProps & { w?: W }) {
  const t = useTheme();
  return <Text {...p} style={[{ fontFamily: font[w], color: t.text, fontSize: 17 }, style]} />;
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name), alignItems: 'center', justifyContent: 'center' }}>
      <T w="semibold" style={{ color: '#fff', fontSize: size * 0.42, lineHeight: size * 0.62 }}>{initial(name)}</T>
    </View>
  );
}

export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.card, borderRadius: 14, overflow: 'hidden', marginBottom: 28 }, style]}>{children}</View>;
}

export function Section({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <T w="medium" style={{ fontSize: 13, color: t.sub, marginHorizontal: 16, marginBottom: 6 }}>{children}</T>;
}

export function Sep({ inset = 16 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: inset }} />;
}

export function Field({ label, ...p }: TextInputProps & { label: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 48 }}>
      <T style={{ width: 92, fontSize: 16 }}>{label}</T>
      <TextInput
        placeholderTextColor={t.sub}
        {...p}
        style={[{ flex: 1, fontFamily: font.regular, fontSize: 17, color: t.text, paddingVertical: 10 }, p.style as TextStyle]}
      />
    </View>
  );
}

export function Btn({ title, color, onPress, disabled, busy, style }: {
  title: string; color?: string; onPress: () => void; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [{
        height: 50, borderRadius: 14, backgroundColor: color ?? t.blue, alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <T w="semibold" style={{ color: '#fff' }}>{title}</T>}
    </Pressable>
  );
}

export function Segmented<V extends string>({ options, value, onChange }: {
  options: { value: V; label: string }[]; value: V; onChange: (v: V) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.fill, borderRadius: 9, padding: 2, margin: 12, marginBottom: 4 }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[{ flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' }, on && { backgroundColor: t.seg, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 }]}>
            <T w="semibold" style={{ fontSize: 14 }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- toast ----
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const y = useRef(new Animated.Value(-120)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const insets = useSafeAreaInsets();
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 18 }).start();
    timer.current = setTimeout(() => Animated.timing(y, { toValue: -120, duration: 250, useNativeDriver: true }).start(), 2200);
  }, [y]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, alignSelf: 'center', transform: [{ translateY: y }], backgroundColor: 'rgba(30,30,30,0.94)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, maxWidth: '90%', zIndex: 99, elevation: 10 }}>
        <T w="medium" style={{ color: '#fff', fontSize: 15 }}>{msg}</T>
      </Animated.View>
    </ToastCtx.Provider>
  );
}
