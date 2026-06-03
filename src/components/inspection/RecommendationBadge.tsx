import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TireCondition } from '../../types';

const CONFIG: Record<TireCondition, { label: string; bg: string; text: string }> = {
  ok:           { label: '✓ OK',             bg: '#3fb95022', text: '#3fb950' },
  monitor:      { label: '⚠ Vigilar',        bg: '#d2992222', text: '#d29922' },
  replace_soon: { label: '↑ Cambio próximo', bg: '#f7816622', text: '#f78166' },
  replace_now:  { label: '✕ Cambio urgente', bg: '#e9456022', text: '#e94560' },
};

export default function RecommendationBadge({ value }: { value: TireCondition }) {
  const { label, bg, text } = CONFIG[value];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  text: { fontSize: 13, fontWeight: '700' },
});
