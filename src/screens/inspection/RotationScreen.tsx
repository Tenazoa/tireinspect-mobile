import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getFleetTires, type FleetTireSpec } from '../../services/api/fleet';
import { TIRE_POSITION_LABELS } from '../../utils/constants';

// Cocada de referencia HOY (estimada por km si existe, si no la última medida)
const coc = (t: FleetTireSpec) => t.projectedDepthMm ?? t.lastDepthMm ?? null;
const cocColor = (mm: number | null) =>
  mm == null ? '#8892b0' : mm < 4 ? '#e94560' : mm < 6 ? '#d29922' : '#3fb950';

interface Swap { a: string; b: string; diff: number; motivo: string; }

/** Genera sugerencias de rotación para emparejar el desgaste. */
function sugerir(tires: FleetTireSpec[]): Swap[] {
  const swaps: Swap[] = [];
  const with_c = tires.filter(t => coc(t) != null);

  // 1) Dentro de cada eje dual: exterior (O) se gasta más que interior (I) del mismo lado.
  //    Si la diferencia > 1.5 mm, swap O↔I de ese lado empareja el desgaste.
  const byAxleSide: Record<string, FleetTireSpec[]> = {};
  with_c.forEach(t => {
    const m = t.position.match(/^A(\d)([LR])([OI])$/);
    if (m) { const k = `A${m[1]}${m[2]}`; (byAxleSide[k] ||= []).push(t); }
  });
  Object.values(byAxleSide).forEach(grp => {
    const o = grp.find(t => t.position.endsWith('O'));
    const i = grp.find(t => t.position.endsWith('I'));
    if (o && i) {
      const diff = Math.abs((coc(o) as number) - (coc(i) as number));
      if (diff >= 1.5) {
        // la más gastada va adentro (posición menos exigente)
        const [gastada, sana] = (coc(o) as number) < (coc(i) as number) ? [o, i] : [i, o];
        swaps.push({ a: gastada.position, b: sana.position, diff: +diff.toFixed(1),
          motivo: `Mismo eje: empareja ${diff.toFixed(1)} mm de diferencia (la más gastada al interior)` });
      }
    }
  });

  // 2) Direccional: FL vs FR. Si difieren > 2 mm, swap lado a lado.
  const fl = with_c.find(t => t.position === 'FL');
  const fr = with_c.find(t => t.position === 'FR');
  if (fl && fr) {
    const diff = Math.abs((coc(fl) as number) - (coc(fr) as number));
    if (diff >= 2) swaps.push({ a: 'FL', b: 'FR', diff: +diff.toFixed(1),
      motivo: `Direccional despareja ${diff.toFixed(1)} mm: rotar lado a lado` });
  }

  return swaps.sort((x, y) => y.diff - x.diff);
}

export default function RotationScreen({ route }: any) {
  const [plate, setPlate] = useState<string>(route?.params?.plate ?? '');
  const [tires, setTires] = useState<FleetTireSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  const buscar = async (p?: string) => {
    const q = (p ?? plate).trim();
    if (!q) return;
    setLoading(true); setBuscado(true);
    try { setTires(await getFleetTires(q)); } finally { setLoading(false); }
  };
  useEffect(() => { if (route?.params?.plate) buscar(route.params.plate); }, []);

  const swaps = sugerir(tires);
  const cocs = tires.map(coc).filter((x): x is number => x != null);
  const min = cocs.length ? Math.min(...cocs) : null;
  const max = cocs.length ? Math.max(...cocs) : null;

  return (
    <ScrollView style={s.container}>
      <View style={s.searchRow}>
        <TextInput
          style={s.input} value={plate} onChangeText={setPlate}
          placeholder="Placa de la unidad" placeholderTextColor="#555"
          autoCapitalize="characters" onSubmitEditing={() => buscar()} />
        <TouchableOpacity style={s.searchBtn} onPress={() => buscar()}>
          <Text style={s.searchBtnTxt}>Analizar</Text>
        </TouchableOpacity>
      </View>

      {loading && <View style={s.center}><ActivityIndicator color="#58a6ff" /></View>}

      {!loading && buscado && tires.length === 0 && (
        <Text style={s.empty}>No encontré llantas para esa placa.</Text>
      )}

      {tires.length > 0 && (
        <>
          <View style={s.summary}>
            <Text style={s.sumTitle}>{plate.toUpperCase()} · {tires.length} llantas</Text>
            {min != null && max != null && (
              <Text style={s.sumSub}>
                Cocada mín <Text style={{ color: cocColor(min), fontWeight: '800' }}>{min.toFixed(1)}mm</Text>
                {'  ·  máx '}<Text style={{ color: cocColor(max), fontWeight: '800' }}>{max.toFixed(1)}mm</Text>
                {'  ·  desbalance '}<Text style={{ fontWeight: '800' }}>{(max - min).toFixed(1)}mm</Text>
              </Text>
            )}
          </View>

          <Text style={s.section}>Rotación sugerida</Text>
          {swaps.length === 0 ? (
            <View style={s.okCard}>
              <Text style={s.okTxt}>✅ Desgaste parejo. No requiere rotación por ahora.</Text>
            </View>
          ) : swaps.map((sw, i) => (
            <View key={i} style={s.swapCard}>
              <View style={s.swapRow}>
                <Text style={s.swapPos}>{TIRE_POSITION_LABELS[sw.a] ?? sw.a}</Text>
                <Text style={s.swapArrow}>⇄</Text>
                <Text style={s.swapPos}>{TIRE_POSITION_LABELS[sw.b] ?? sw.b}</Text>
              </View>
              <Text style={s.swapMotivo}>{sw.motivo}</Text>
            </View>
          ))}

          <Text style={s.section}>Cocada por posición</Text>
          {tires.map(t => {
            const c = coc(t);
            return (
              <View key={t.position} style={s.tireRow}>
                <Text style={s.tirePos}>{TIRE_POSITION_LABELS[t.position] ?? t.position}</Text>
                <Text style={[s.tireCoc, { color: cocColor(c) }]}>{c != null ? `${c.toFixed(1)} mm` : '—'}</Text>
              </View>
            );
          })}
          <Text style={s.note}>La rotación empareja el desgaste y alarga la vida de la flota. Registra el cambio físico en SOLOMON.</Text>
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  searchRow: { flexDirection: 'row', gap: 10, padding: 16 },
  input: { flex: 1, backgroundColor: '#161b22', borderRadius: 10, padding: 13, color: '#e6f1ff', fontSize: 16, borderWidth: 1, borderColor: '#30363d', letterSpacing: 1 },
  searchBtn: { backgroundColor: '#1f6feb', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  searchBtnTxt: { color: '#fff', fontWeight: '700' },
  center: { padding: 30, alignItems: 'center' },
  empty: { color: '#8892b0', textAlign: 'center', marginTop: 30 },
  summary: { marginHorizontal: 16, backgroundColor: '#161b22', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#30363d' },
  sumTitle: { fontSize: 17, fontWeight: '800', color: '#58a6ff', letterSpacing: 1 },
  sumSub: { fontSize: 13, color: '#8892b0', marginTop: 6 },
  section: { fontSize: 11, color: '#8892b0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  okCard: { marginHorizontal: 16, backgroundColor: '#0f2a17', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#238636' },
  okTxt: { color: '#3fb950', fontSize: 14, fontWeight: '600' },
  swapCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#161b22', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#d29922' },
  swapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  swapPos: { fontSize: 15, fontWeight: '800', color: '#e6f1ff' },
  swapArrow: { fontSize: 22, color: '#d29922', fontWeight: '800' },
  swapMotivo: { fontSize: 12, color: '#8892b0', marginTop: 8, textAlign: 'center' },
  tireRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#161b22' },
  tirePos: { fontSize: 14, color: '#e6f1ff' },
  tireCoc: { fontSize: 15, fontWeight: '800' },
  note: { fontSize: 12, color: '#6e7681', margin: 16, fontStyle: 'italic' },
});
