import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { searchVehiclesByPlate } from '../../services/storage/database';
import { searchVehicleByPlateAPI, fetchMyFleet } from '../../services/api/vehicles';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useInspectionStore } from '../../store/inspectionStore';
import { useAuthStore } from '../../store/authStore';
import type { Vehicle } from '../../types';
import { TIRE_POSITION_LABELS } from '../../utils/constants';

export default function VehicleLookupScreen() {
  const navigation = useNavigation<any>();
  const { inspector } = useAuthStore();
  const { startInspection } = useInspectionStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Vehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Cargar toda la flota al abrir, para mostrar las placas
  useEffect(() => {
    setLoading(true);
    fetchMyFleet()
      .then((list) => { setAllVehicles(list); setResults(list); })
      .finally(() => setLoading(false));
  }, []);

  // Filtrar la lista mientras se escribe
  useEffect(() => {
    const q = query.trim().toUpperCase();
    if (!q) { setResults(allVehicles); return; }
    setResults(allVehicles.filter(v =>
      v.plate?.toUpperCase().includes(q) ||
      `${v.brand} ${v.model}`.toUpperCase().includes(q)));
  }, [query, allVehicles]);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) return;
    // si no está en la flota cargada, consultar al servidor
    if (results.length === 0) {
      setLoading(true); setSearched(true);
      try {
        const remote = await searchVehicleByPlateAPI(query);
        setResults(remote);
      } catch {
        Alert.alert('Sin conexión', 'No se encontraron vehículos.');
      } finally { setLoading(false); }
    }
  }, [query, results.length]);

  const handleSelect = (vehicle: Vehicle) => {
    if (!inspector) return;
    startInspection(vehicle, inspector.id);
    navigation.navigate('InspectionFlow');
  };

  const handleCreateNew = () => {
    navigation.navigate('VehicleForm', { plate: query.toUpperCase() });
  };

  // ── Buscar placa por voz ──
  const [listening, setListening] = useState(false);
  const NUMW: Record<string, string> = { cero:'0', uno:'1', dos:'2', tres:'3', cuatro:'4', cinco:'5', seis:'6', siete:'7', ocho:'8', nueve:'9' };
  const normalizePlate = (text: string) => {
    const tokens = text.toLowerCase().replace(/[-.]/g, ' ').split(/\s+/);
    let out = '';
    for (const tk of tokens) out += (NUMW[tk] ?? tk);
    return out.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };
  useSpeechRecognitionEvent('result', (e: any) => {
    const txt = e.results?.[0]?.transcript ?? '';
    if (txt) setQuery(normalizePlate(txt));
  });
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('error', () => setListening(false));
  const startPlateVoice = async () => {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('Micrófono', 'Habilita el micrófono para dictar la placa.'); return; }
      setListening(true);
      ExpoSpeechRecognitionModule.start({ lang: 'es-PE', interimResults: true, continuous: false });
    } catch { setListening(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Nueva Inspección</Text>
      <Text style={styles.sub}>Busca el vehículo por placa</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={(t) => setQuery(t.toUpperCase())}
          placeholder="Ej: ABC-123"
          placeholderTextColor="#555"
          autoCapitalize="characters"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: listening ? '#e94560' : '#238636' }]} onPress={startPlateVoice}>
          <Text style={styles.searchBtnText}>{listening ? '🎤…' : '🎤'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.searchBtnText}>Buscar</Text>
          }
        </TouchableOpacity>
      </View>
      <Text style={{ color: '#8892b0', fontSize: 12, marginBottom: 8 }}>{results.length} unidades · toca 🎤 y di la placa</Text>

      {!loading && (
        <>
          <FlatList
            data={results}
            keyExtractor={(v) => v.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.vehicleCard} onPress={() => handleSelect(item)}>
                <Text style={styles.plate}>{item.plate}</Text>
                <Text style={styles.vehicleInfo}>{item.brand} {item.model} · {item.year}</Text>
                <Text style={styles.positions}>
                  {item.tirePositions.map((p) => TIRE_POSITION_LABELS[p]).join(' · ')}
                </Text>
                {item.lastInspection && (
                  <Text style={styles.lastInspection}>
                    Última inspección: {new Date(item.lastInspection).toLocaleDateString('es-PE')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No se encontró ningún vehículo con esa placa.</Text>
                <TouchableOpacity style={styles.createBtn} onPress={handleCreateNew}>
                  <Text style={styles.createBtnText}>+ Registrar nuevo vehículo</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', padding: 20 },
  heading: { fontSize: 24, fontWeight: '700', color: '#e6f1ff', marginBottom: 4 },
  sub: { fontSize: 14, color: '#8892b0', marginBottom: 20 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: {
    flex: 1, backgroundColor: '#161b22', borderRadius: 10, padding: 14,
    color: '#e6f1ff', fontSize: 18, fontWeight: '700', letterSpacing: 2,
    borderWidth: 1, borderColor: '#30363d',
  },
  searchBtn: {
    backgroundColor: '#e94560', borderRadius: 10,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  vehicleCard: {
    backgroundColor: '#161b22', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#30363d',
  },
  plate: { fontSize: 22, fontWeight: '800', color: '#58a6ff', letterSpacing: 2 },
  vehicleInfo: { fontSize: 15, color: '#e6f1ff', marginTop: 4 },
  positions: { fontSize: 12, color: '#8892b0', marginTop: 4 },
  lastInspection: { fontSize: 11, color: '#3fb950', marginTop: 6 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#8892b0', fontSize: 15, marginBottom: 16, textAlign: 'center' },
  createBtn: {
    backgroundColor: '#238636', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
