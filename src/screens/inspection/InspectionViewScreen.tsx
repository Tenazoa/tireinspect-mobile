import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchInspectionDetail } from '../../services/api/inspections';
import { useInspectionStore } from '../../store/inspectionStore';
import { useAuthStore } from '../../store/authStore';

const REC_COLOR: Record<string, string> = { ok: '#3fb950', monitor: '#d29922', replace_soon: '#f78166', replace_now: '#e94560' };
const REC_LABEL: Record<string, string> = { ok: 'OK', monitor: 'Vigilar', replace_soon: 'Cambio próximo', replace_now: 'Cambio urgente' };
const km = (v: any) => v != null ? Number(v).toLocaleString('es-PE') : '—';

// Categoría (para resumen y filtro): crítica / vigilar / ok
const catOf = (rec: string) => (rec === 'replace_now' || rec === 'replace_soon') ? 'crit' : (rec === 'monitor' ? 'warn' : 'ok');
const CAT_COLOR: Record<string, string> = { crit: '#e94560', warn: '#d29922', ok: '#3fb950' };

export default function InspectionViewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const id = route.params?.id;
  const vehicle = route.params?.vehicle;
  const { startInspection, saveGlobalInspection } = useInspectionStore();
  const { inspector } = useAuthStore();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'crit' | 'warn' | 'ok'>('all');
  const [openPos, setOpenPos] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInspectionDetail(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  const tires: any[] = data?.tires ?? [];
  const resumen = useMemo(() => {
    let min = Infinity, crit = 0, warn = 0, ok = 0;
    for (const t of tires) {
      if (t.depth != null && t.depth < min) min = t.depth;
      const c = catOf(t.recommendation);
      if (c === 'crit') crit++; else if (c === 'warn') warn++; else ok++;
    }
    return { min: min === Infinity ? null : min, crit, warn, ok };
  }, [tires]);

  const shown = filter === 'all' ? tires : tires.filter(t => catOf(t.recommendation) === filter);

  const sharePdf = async () => {
    try {
      const base = (await AsyncStorage.getItem('ti_api_base')) || 'https://tireinspect-api.onrender.com';
      const token = await SecureStore.getItemAsync('auth_token');
      await Linking.openURL(`${base}/api/v1/inspections/${id}/pdf?token=${token}`);
    } catch { Alert.alert('PDF', 'No se pudo abrir el PDF.'); }
  };
  const startInsp = () => {
    if (!inspector || !vehicle) return;
    startInspection(vehicle, inspector.id);
    navigation.navigate('InspectionFlow');
  };
  const guardarGlobal = () => {
    if (!inspector || !vehicle) return;
    Alert.alert(
      'Guardar inspección de la unidad',
      `Se guardará la inspección de las ${(data?.tires ?? []).length} llantas de ${vehicle.plate} con la cocada conocida de SOLOMON, todas de una vez. ¿Confirmar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          onPress: async () => {
            setSaving(true);
            try {
              const n = await saveGlobalInspection(vehicle, inspector.id);
              Alert.alert('✅ Inspección guardada', `Se registró la inspección de ${n} llantas de ${vehicle.plate}.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]);
            } catch {
              Alert.alert('Error', 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
            } finally { setSaving(false); }
          },
        },
      ]
    );
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#58a6ff" /></View>;
  if (!data) return <View style={s.center}><Text style={s.muted}>No se pudo cargar el detalle.</Text></View>;

  const Chip = ({ k, label, count, color }: { k: any; label: string; count: number; color: string }) => (
    <TouchableOpacity onPress={() => setFilter(filter === k ? 'all' : k)}
      style={[s.chip, filter === k && { backgroundColor: color + '22', borderColor: color }]}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={[s.chipTxt, filter === k && { color }]}>{label} {count}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.plate}>{data.plate}</Text>
      <Text style={s.vehicle}>{data.vehicleLabel}</Text>
      <Text style={s.meta}>Inspector: {data.inspectorName} · {data.date ? new Date(data.date).toLocaleDateString('es-PE') : ''}</Text>

      {/* Resumen de estado de la unidad */}
      <View style={s.resumen}>
        <View style={s.resumenLeft}>
          <Text style={s.resumenLabel}>COCADA MÍNIMA</Text>
          <Text style={[s.resumenMin, { color: resumen.min == null ? '#8892b0' : (resumen.min < 4 ? '#e94560' : resumen.min < 6 ? '#d29922' : '#3fb950') }]}>
            {resumen.min != null ? `${resumen.min.toFixed(1)} mm` : '—'}
          </Text>
          <Text style={s.meta}>{tires.length} llantas</Text>
        </View>
        <View style={s.chipsWrap}>
          <Chip k="crit" label="Cambio" count={resumen.crit} color={CAT_COLOR.crit} />
          <Chip k="warn" label="Vigilar" count={resumen.warn} color={CAT_COLOR.warn} />
          <Chip k="ok" label="OK" count={resumen.ok} color={CAT_COLOR.ok} />
        </View>
      </View>

      <View style={s.btnRow}>
        <TouchableOpacity style={[s.btn, { backgroundColor: '#1f6feb' }]} onPress={sharePdf}>
          <Text style={s.btnTxt}>📄 Compartir PDF</Text>
        </TouchableOpacity>
        {vehicle && (
          <TouchableOpacity style={[s.btn, { backgroundColor: '#238636' }]} onPress={startInsp}>
            <Text style={s.btnTxt}>🔍 Inspeccionar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Guardar la inspección de TODA la unidad de una vez */}
      {vehicle && (
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={guardarGlobal} disabled={saving}>
          <Text style={s.saveTxt}>{saving ? 'Guardando…' : '💾 Guardar inspección de la unidad'}</Text>
          <Text style={s.saveSub}>Registra las {(data?.tires ?? []).length} llantas de una vez</Text>
        </TouchableOpacity>
      )}

      {filter !== 'all' && (
        <TouchableOpacity onPress={() => setFilter('all')} style={s.clearFilter}>
          <Text style={s.clearFilterTxt}>Mostrando “{filter === 'crit' ? 'Cambio' : filter === 'warn' ? 'Vigilar' : 'OK'}” · toca para ver todas ✕</Text>
        </TouchableOpacity>
      )}

      {shown.map((t: any, i: number) => {
        const color = REC_COLOR[t.recommendation] ?? '#8892b0';
        const pct = t.depth != null ? Math.max(4, Math.min(100, (t.depth / 22) * 100)) : 0;
        const open = openPos === t.position;
        return (
          <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => setOpenPos(open ? null : t.position)}
            style={[s.card, { borderLeftColor: color }]}>
            <View style={s.cardTop}>
              <Text style={s.pos}>{t.position}</Text>
              <Text style={[s.rec, { color }]}>{REC_LABEL[t.recommendation] ?? t.recommendation}</Text>
            </View>
            <Text style={[s.depth, { color }]}>{t.depth != null ? `${t.depth.toFixed(1)} mm` : 'Sin medición'} <Text style={s.depthSub}>(la menor)</Text></Text>
            {/* Barra visual de cocada */}
            <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} /></View>
            {(t.brand || t.model) && <Text style={s.brand}>{t.brand} {t.model}</Text>}
            <Text style={s.line}>{t.size ?? ''}{t.code ? `  ·  🔥 ${t.code}` : ''}{t.life ? `  ·  ${t.life}` : ''}</Text>

            {/* Detalle expandible al tocar */}
            {open && (
              <View style={s.expand}>
                {(t.depthInner != null || t.depthCenter != null || t.depthOuter != null) && (
                  <Text style={s.line}>Zonas — Int {t.depthInner ?? '—'} · Centro {t.depthCenter ?? '—'} · Ext {t.depthOuter ?? '—'} mm</Text>
                )}
                {(t.kmLife != null || t.kmTotal != null) && (
                  <Text style={s.line}>🛣 Recorrido {km(t.kmLife)} · Acum. {km(t.kmTotal)} km</Text>
                )}
                {t.pressurePsi != null && <Text style={s.line}>Presión: {t.pressurePsi} PSI</Text>}
                {t.notes ? <Text style={s.line}>📝 {t.notes}</Text> : null}
              </View>
            )}
            {!open && <Text style={s.tapHint}>toca para ver más ▾</Text>}
          </TouchableOpacity>
        );
      })}
      {shown.length === 0 && <Text style={[s.muted, { textAlign: 'center', marginTop: 20 }]}>Ninguna llanta en “{filter}”.</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  center: { flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#8892b0' },
  plate: { fontSize: 26, fontWeight: '800', color: '#58a6ff', letterSpacing: 2 },
  vehicle: { fontSize: 15, color: '#e6f1ff', marginTop: 2 },
  meta: { fontSize: 12, color: '#8892b0', marginTop: 2 },
  resumen: { flexDirection: 'row', backgroundColor: '#161b22', borderRadius: 14, borderWidth: 1, borderColor: '#30363d', padding: 14, marginTop: 12, alignItems: 'center' },
  resumenLeft: { marginRight: 14 },
  resumenLabel: { fontSize: 10, color: '#8892b0', fontWeight: '700', letterSpacing: 1 },
  resumenMin: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  chipsWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#30363d', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipTxt: { fontSize: 12, color: '#c9d1d9', fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 14 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  saveBtn: { backgroundColor: '#0d419d', borderWidth: 1, borderColor: '#1f6feb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  saveSub: { color: '#9fc5ff', fontSize: 11, marginTop: 2 },
  clearFilter: { paddingVertical: 6, marginBottom: 6 },
  clearFilterTxt: { color: '#58a6ff', fontSize: 12 },
  card: { backgroundColor: '#161b22', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderWidth: 1, borderColor: '#30363d' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pos: { fontSize: 13, fontWeight: '700', color: '#8892b0', textTransform: 'uppercase' },
  rec: { fontSize: 12, fontWeight: '700' },
  depth: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  depthSub: { fontSize: 12, fontWeight: '400', color: '#8892b0' },
  barBg: { height: 6, borderRadius: 3, backgroundColor: '#30363d', marginTop: 8, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  brand: { fontSize: 14, color: '#e6f1ff', fontWeight: '700', marginTop: 8 },
  line: { fontSize: 12, color: '#8892b0', marginTop: 2 },
  expand: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#30363d', paddingTop: 8 },
  tapHint: { fontSize: 10, color: '#586069', marginTop: 6 },
});
