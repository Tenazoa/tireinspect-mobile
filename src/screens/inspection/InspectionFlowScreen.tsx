import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useInspectionStore } from '../../store/inspectionStore';
import TirePositionCard from '../../components/inspection/TirePositionCard';
import { TIRE_POSITION_LABELS } from '../../utils/constants';
import type { TirePosition } from '../../types';

export default function InspectionFlowScreen() {
  const navigation = useNavigation<any>();
  const { currentInspection, completeInspection, discardInspection } = useInspectionStore();
  const [completing, setCompleting] = useState(false);

  if (!currentInspection) {
    navigation.goBack();
    return null;
  }

  const { vehicle, tires } = currentInspection;

  const completedCount = tires.filter(
    (t) => t.photos.length > 0 || t.treadDepthCenter != null
  ).length;

  const handleComplete = async () => {
    if (completedCount === 0) {
      Alert.alert('Inspección vacía', 'Debes inspeccionar al menos una llanta antes de completar.');
      return;
    }
    Alert.alert(
      'Completar inspección',
      `¿Confirmar inspección de ${vehicle?.plate}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          onPress: async () => {
            setCompleting(true);
            await completeInspection();
            navigation.navigate('InspectionReport');
          },
        },
      ]
    );
  };

  const handleDiscard = () => {
    Alert.alert('Descartar', '¿Seguro que quieres cancelar esta inspección?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, descartar', style: 'destructive', onPress: () => {
        discardInspection();
        navigation.popToTop();
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.plateText}>{vehicle?.plate}</Text>
          <Text style={styles.vehicleText}>{vehicle?.brand} {vehicle?.model} · {vehicle?.year}</Text>
        </View>
        <View style={styles.progress}>
          <Text style={styles.progressText}>{completedCount}/{tires.length}</Text>
          <Text style={styles.progressLabel}>llantas</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${(completedCount / tires.length) * 100}%` }]} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Posiciones de llantas</Text>
        {tires.map((tire) => (
          <TirePositionCard
            key={tire.id}
            tire={tire}
            onPress={() => navigation.navigate('TireInspection', { position: tire.position })}
          />
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
          <Text style={styles.discardText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.completeBtn, completing && styles.btnDisabled]}
          onPress={handleComplete}
          disabled={completing}
        >
          <Text style={styles.completeText}>
            {completing ? 'Guardando...' : 'Completar inspección'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 12, backgroundColor: '#161b22',
  },
  plateText: { fontSize: 26, fontWeight: '800', color: '#58a6ff', letterSpacing: 2 },
  vehicleText: { fontSize: 13, color: '#8892b0', marginTop: 2 },
  progress: { alignItems: 'center' },
  progressText: { fontSize: 24, fontWeight: '800', color: '#3fb950' },
  progressLabel: { fontSize: 11, color: '#8892b0' },
  progressBarBg: { height: 4, backgroundColor: '#30363d' },
  progressBarFill: { height: 4, backgroundColor: '#3fb950' },
  scroll: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 13, color: '#8892b0', fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: '#161b22', borderTopWidth: 1, borderTopColor: '#30363d',
  },
  discardBtn: {
    flex: 1, borderRadius: 10, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#30363d',
  },
  discardText: { color: '#8892b0', fontWeight: '600', fontSize: 15 },
  completeBtn: {
    flex: 2, backgroundColor: '#238636', borderRadius: 10, padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  completeText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
