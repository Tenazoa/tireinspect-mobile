import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  depthMm: number;
}

// Legal limit: 1.6mm | Safety threshold: 3mm | New tire: ~8mm
function getColor(mm: number): string {
  if (mm <= 1.6) return '#e94560';
  if (mm <= 3.0) return '#f78166';
  if (mm <= 4.0) return '#d29922';
  return '#3fb950';
}

function getLabel(mm: number): string {
  if (mm <= 1.6) return 'Cambio urgente — límite legal';
  if (mm <= 3.0) return 'Cambio próximo recomendado';
  if (mm <= 4.0) return 'Vigilar — 50% de vida útil';
  return 'Buen estado';
}

export default function TreadDepthIndicator({ depthMm }: Props) {
  const pct = Math.min((depthMm / 8) * 100, 100);
  const color = getColor(depthMm);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.value, { color }]}>{depthMm.toFixed(1)} mm</Text>
        <Text style={styles.label}>{getLabel(depthMm)}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        {/* Markers */}
        <View style={[styles.marker, { left: `${(1.6 / 8) * 100}%` }]} />
        <View style={[styles.marker, { left: `${(3 / 8) * 100}%` }]} />
      </View>
      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>0</Text>
        <Text style={[styles.scaleText, { color: '#e94560' }]}>1.6</Text>
        <Text style={[styles.scaleText, { color: '#f78166' }]}>3</Text>
        <Text style={styles.scaleText}>8 mm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  value: { fontSize: 28, fontWeight: '800' },
  label: { fontSize: 13, color: '#8892b0', flex: 1 },
  barBg: { height: 12, backgroundColor: '#30363d', borderRadius: 6, overflow: 'hidden', position: 'relative' },
  barFill: { height: '100%', borderRadius: 6 },
  marker: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#0d1117' },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  scaleText: { fontSize: 10, color: '#8892b0' },
});
