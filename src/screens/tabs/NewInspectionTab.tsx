import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { searchVehiclesByPlate } from '../../services/storage/database';
import { searchVehicleByPlateAPI } from '../../services/api/vehicles';
import { useInspectionStore } from '../../store/inspectionStore';
import { useAuthStore } from '../../store/authStore';
import { TIRE_POSITION_LABELS } from '../../utils/constants';
import type { Vehicle } from '../../types';

export default function NewInspectionTab() {
  const navigation = useNavigation<any>();
  const { inspector } = useAuthStore();
  const { startInspection } = useInspectionStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) return;
    setLoading(true); setSearched(true);
    try {
      const local = await searchVehiclesByPlate(query);
      if (local.length > 0) { setResults(local); return; }
      const remote = await searchVehicleByPlateAPI(query);
      setResults(remote);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [query]);

  const handleSelect = (vehicle: Vehicle) => {
    if (!inspector) return;
    startInspection(vehicle, inspector.id);
    navigation.navigate('InspectionFlow');
  };

  return (
    <View style={s.container}>
      <Text style={s.heading}>Nueva Inspección</Text>
      <Text style={s.sub}>Busca el vehículo por placa</Text>
      <View style={s.row}>
        <TextInput style={s.input} value={query} onChangeText={t => setQuery(t.toUpperCase())}
          placeholder="Ej: ABC-123" placeholderTextColor="#555" autoCapitalize="characters"
          returnKeyType="search" onSubmitEditing={handleSearch} />
        <TouchableOpacity style={s.searchBtn} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.searchBtnText}>Buscar</Text>}
        </TouchableOpacity>
      </View>
      {searched && !loading && (
        <FlatList data={results} keyExtractor={v => v.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => handleSelect(item)}>
              <Text style={s.plate}>{item.plate}</Text>
              <Text style={s.info}>{item.brand} {item.model} · {item.year}</Text>
              <Text style={s.positions}>{item.tirePositions.map((p:any) => TIRE_POSITION_LABELS[p]).join(' · ')}</Text>
              {item.lastInspection && <Text style={s.last}>Última: {new Date(item.lastInspection).toLocaleDateString('es-PE')}</Text>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>Vehículo no encontrado</Text>
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
  sub:{ fontSize:14, color:'#8892b0', marginBottom:20 },
  row:{ flexDirection:'row', gap:10, marginBottom:20 },
  input:{ flex:1, backgroundColor:'#161b22', borderRadius:10, padding:14, color:'#e6f1ff', fontSize:18, fontWeight:'700', letterSpacing:2, borderWidth:1, borderColor:'#30363d' },
  searchBtn:{ backgroundColor:'#e94560', borderRadius:10, paddingHorizontal:20, justifyContent:'center' },
  searchBtnText:{ color:'#fff', fontWeight:'700', fontSize:15 },
  card:{ backgroundColor:'#161b22', borderRadius:12, padding:16, marginBottom:12, borderWidth:1, borderColor:'#30363d' },
  plate:{ fontSize:22, fontWeight:'800', color:'#58a6ff', letterSpacing:2 },
  info:{ fontSize:15, color:'#e6f1ff', marginTop:4 },
  positions:{ fontSize:12, color:'#8892b0', marginTop:4 },
  last:{ fontSize:11, color:'#3fb950', marginTop:6 },
  empty:{ alignItems:'center', marginTop:40 },
  emptyText:{ color:'#8892b0', fontSize:15, marginBottom:16 },
  newBtn:{ backgroundColor:'#238636', borderRadius:10, paddingVertical:12, paddingHorizontal:24 },
  newBtnText:{ color:'#fff', fontWeight:'700', fontSize:15 },
});
