import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchMyFleet } from '../../services/api/vehicles';
import { useInspectionStore } from '../../store/inspectionStore';
import { useAuthStore } from '../../store/authStore';
import type { Vehicle } from '../../types';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export default function NewInspectionTab() {
  const navigation = useNavigation<any>();
  const { inspector } = useAuthStore();
  const { startInspection } = useInspectionStore();
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);

  // Cargar toda la flota al abrir → mostrar las placas
  useEffect(() => {
    setLoading(true);
    fetchMyFleet().then(setAll).finally(() => setLoading(false));
  }, []);

  const q = query.trim().toUpperCase();
  const results = !q ? all : all.filter(v =>
    v.plate?.toUpperCase().includes(q) || `${v.brand} ${v.model}`.toUpperCase().includes(q));

  // Voz para dictar la placa
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

  const handleSelect = (vehicle: Vehicle) => {
    if (!inspector) return;
    // Mostrar las llantas de la unidad (km/cocada/vida) + opciones PDF / inspeccionar
    navigation.navigate('InspectionView', { id: `seed-${vehicle.id}`, vehicle });
  };

  return (
    <View style={s.container}>
      <Text style={s.heading}>Nueva Inspección</Text>
      <Text style={s.sub}>Busca la unidad por placa o dicta con 🎤</Text>
      <View style={s.row}>
        <TextInput style={s.input} value={query} onChangeText={t => setQuery(t.toUpperCase())}
          placeholder="Placa o modelo" placeholderTextColor="#555" autoCapitalize="characters" />
        <TouchableOpacity style={[s.micBtn, { backgroundColor: listening ? '#e94560' : '#238636' }]} onPress={startPlateVoice}>
          <Text style={s.micText}>{listening ? '🎤…' : '🎤'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.count}>{results.length} unidades {query ? '(filtradas)' : '· toca una para inspeccionar'}</Text>

      {loading ? (
        <ActivityIndicator color="#58a6ff" style={{ marginTop: 30 }} />
      ) : (
        <FlatList data={results} keyExtractor={v => v.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => handleSelect(item)}>
              <Text style={s.plate}>{item.plate}</Text>
              <Text style={s.info}>{item.brand} {item.model}{item.year ? ` · ${item.year}` : ''}</Text>
              <Text style={s.positions}>{(item.tirePositions || []).length} llantas</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>Sin coincidencias</Text>
              <TouchableOpacity style={s.newBtn} onPress={() => navigation.navigate('NewVehicle')}>
                <Text style={s.newBtnText}>+ Registrar nuevo vehículo</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0d1117', padding:20 },
  heading:{ fontSize:24, fontWeight:'700', color:'#e6f1ff', marginBottom:4 },
  sub:{ fontSize:14, color:'#8892b0', marginBottom:16 },
  row:{ flexDirection:'row', gap:10, marginBottom:8 },
  input:{ flex:1, backgroundColor:'#161b22', borderRadius:10, padding:14, color:'#e6f1ff', fontSize:18, fontWeight:'700', letterSpacing:2, borderWidth:1, borderColor:'#30363d' },
  micBtn:{ borderRadius:10, paddingHorizontal:18, justifyContent:'center' },
  micText:{ color:'#fff', fontWeight:'700', fontSize:18 },
  count:{ fontSize:12, color:'#8892b0', marginBottom:12 },
  card:{ backgroundColor:'#161b22', borderRadius:12, padding:16, marginBottom:10, borderWidth:1, borderColor:'#30363d' },
  plate:{ fontSize:22, fontWeight:'800', color:'#58a6ff', letterSpacing:2 },
  info:{ fontSize:15, color:'#e6f1ff', marginTop:4 },
  positions:{ fontSize:12, color:'#8892b0', marginTop:4 },
  empty:{ alignItems:'center', marginTop:40 },
  emptyText:{ color:'#8892b0', fontSize:15, marginBottom:16 },
  newBtn:{ backgroundColor:'#238636', borderRadius:10, paddingVertical:12, paddingHorizontal:24 },
  newBtnText:{ color:'#fff', fontWeight:'700', fontSize:15 },
});
