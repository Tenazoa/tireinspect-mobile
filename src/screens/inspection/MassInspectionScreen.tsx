import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getPendientesInspeccion, type PendienteInspeccion } from '../../services/api/fleet';
import { searchVehicleByPlateAPI } from '../../services/api/vehicles';
import { useInspectionStore } from '../../store/inspectionStore';
import { useAuthStore } from '../../store/authStore';

const cocColor = (mm: number | null) =>
  mm == null ? '#8892b0' : mm < 4 ? '#e94560' : mm < 6 ? '#d29922' : '#3fb950';

export default function MassInspectionScreen() {
  const { inspector } = useAuthStore();
  const { saveGlobalInspection } = useInspectionStore();
  const [items, setItems] = useState<PendienteInspeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getPendientesInspeccion(8000).then(r => setItems(r.items)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const guardarUno = async (plate: string) => {
    if (!inspector) return;
    setBusy(plate);
    try {
      const vs = await searchVehicleByPlateAPI(plate);
      const v = vs.find(x => (x.plate || '').toUpperCase() === plate.toUpperCase()) || vs[0];
      if (!v) { Alert.alert('Error', `No encontré la unidad ${plate}.`); return; }
      const n = await saveGlobalInspection(v, inspector.id);
      setDone(d => ({ ...d, [plate]: true }));
    } catch {
      Alert.alert('Error', `No se pudo guardar ${plate}.`);
    } finally { setBusy(null); }
  };

  const guardarTodas = () => {
    const pend = items.filter(i => !done[i.plate]);
    Alert.alert('Guardar TODAS', `Se registrará la inspección de ${pend.length} unidades con su cocada estimada por km. ¿Confirmar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Guardar todas', onPress: async () => {
        for (const it of pend) { await guardarUno(it.plate); }
        Alert.alert('✅ Listo', `Se guardaron ${pend.length} inspecciones.`);
      } },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#58a6ff" /></View>;

  const pendientes = items.filter(i => !done[i.plate]).length;

  return (
    <View style={s.container}>
      <View style={s.head}>
        <Text style={s.title}>Unidades por inspeccionar</Text>
        <Text style={s.sub}>Rodaron más de 8,000 km desde su última inspección · cocada estimada por desgaste</Text>
        <View style={s.headRow}>
          <Text style={s.count}>{pendientes} pendientes</Text>
          {pendientes > 0 && (
            <TouchableOpacity style={s.allBtn} onPress={guardarTodas}>
              <Text style={s.allTxt}>💾 Guardar todas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.plate}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={s.empty}>Ninguna unidad pasó el umbral. 👍</Text>}
        renderItem={({ item }) => {
          const ok = done[item.plate];
          return (
            <View style={[s.card, ok && { opacity: 0.5 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.plate}>{item.plate}</Text>
                <Text style={s.line}>🛣 {item.kmRecorrido.toLocaleString('es-PE')} km desde {item.ultimaInspeccion ? new Date(item.ultimaInspeccion).toLocaleDateString('es-PE') : 'sin inspección'}</Text>
                <Text style={s.line}>
                  Cocada mín: <Text style={{ color: cocColor(item.cocadaMinActual) }}>{item.cocadaMinActual ?? '—'}mm</Text>
                  {'  →  est. '}<Text style={{ color: cocColor(item.cocadaMinEstimada), fontWeight: '800' }}>{item.cocadaMinEstimada ?? '—'}mm</Text>
                  {`  · ${item.llantas} llantas`}
                </Text>
              </View>
              {ok ? (
                <Text style={s.doneTxt}>✅ Guardada</Text>
              ) : (
                <TouchableOpacity style={s.btn} onPress={() => guardarUno(item.plate)} disabled={busy === item.plate}>
                  <Text style={s.btnTxt}>{busy === item.plate ? '…' : 'Guardar'}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  center: { flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center' },
  head: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#21262d' },
  title: { fontSize: 20, fontWeight: '800', color: '#e6f1ff' },
  sub: { fontSize: 12, color: '#8892b0', marginTop: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  count: { fontSize: 14, fontWeight: '700', color: '#d29922' },
  allBtn: { backgroundColor: '#0d419d', borderWidth: 1, borderColor: '#1f6feb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  allTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161b22', borderRadius: 12, borderWidth: 1, borderColor: '#30363d', padding: 14, marginBottom: 10 },
  plate: { fontSize: 18, fontWeight: '800', color: '#58a6ff', letterSpacing: 1 },
  line: { fontSize: 12, color: '#8892b0', marginTop: 3 },
  btn: { backgroundColor: '#238636', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  btnTxt: { color: '#fff', fontWeight: '700' },
  doneTxt: { color: '#3fb950', fontWeight: '700' },
  empty: { color: '#8892b0', textAlign: 'center', marginTop: 40 },
});
