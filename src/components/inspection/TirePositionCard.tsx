import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { TireInspection } from '../../types';
import { TIRE_POSITION_LABELS } from '../../utils/constants';

interface Props {
  tire: TireInspection;
  onPress: () => void;
}

const RECOMMENDATION_COLORS = {
  ok: '#3fb950',
  monitor: '#d29922',
  replace_soon: '#f78166',
  replace_now: '#e94560',
};

const RECOMMENDATION_LABELS = {
  ok: 'OK',
  monitor: 'Vigilar',
  replace_soon: 'Cambio próximo',
  replace_now: 'Cambio urgente',
};

export default function TirePositionCard({ tire, onPress }: Props) {
  const isInspected = tire.photos.length > 0 || tire.treadDepthCenter != null;
  const color = RECOMMENDATION_COLORS[tire.recommendation];

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.position}>{TIRE_POSITION_LABELS[tire.position]}</Text>
        {isInspected ? (
          <>
            {tire.treadDepthCenter != null && (
              <Text style={styles.depth}>{tire.treadDepthCenter.toFixed(1)} mm</Text>
            )}
            <View style={[styles.badge, { backgroundColor: color + '22' }]}>
              <Text style={[styles.badgeText, { color }]}>{RECOMMENDATION_LABELS[tire.recommendation]}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.pending}>Pendiente de inspección</Text>
        )}
      </View>

      <View style={styles.right}>
        {isInspected ? (
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        ) : (
          <View style={styles.pendingCircle}>
            <Text style={styles.pendingArrow}>›</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161b22', borderRadius: 12, padding: 16, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderLeftWidth: 4, borderWidth: 1, borderColor: '#30363d',
  },
  left: { flex: 1 },
  position: { fontSize: 16, fontWeight: '700', color: '#e6f1ff' },
  depth: { fontSize: 22, fontWeight: '800', color: '#58a6ff', marginTop: 4 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  pending: { fontSize: 13, color: '#8892b0', marginTop: 4 },
  right: { marginLeft: 12 },
  checkCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#3fb95022', alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 18, color: '#3fb950' },
  pendingCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#30363d', alignItems: 'center', justifyContent: 'center',
  },
  pendingArrow: { fontSize: 22, color: '#8892b0' },
});
