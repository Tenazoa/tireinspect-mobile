import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { fetchInspectionDetail } from '../../services/api/inspections';

const REC_COLOR: Record<string, string> = { ok:'#3fb950', monitor:'#d29922', replace_soon:'#f78166', replace_now:'#e94560' };
const REC_LABEL: Record<string, string> = { ok:'OK', monitor:'Vigilar', replace_soon:'Cambio próximo', replace_now:'Cambio urgente' };
const km = (v: any) => v != null ? Number(v).toLocaleString('es-PE') : '—';

export default function InspectionViewScreen() {
  const route = useRoute<any>();
  const id = route.params?.id;
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspectionDetail(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#58a6ff" /></View>;
  if (!data) return <View style={s.center}><Text style={s.muted}>No se pudo cargar el detalle.</Text></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.plate}>{data.plate}</Text>
      <Text style={s.vehicle}>{data.vehicleLabel}</Text>
      <Text style={s.meta}>Inspector: {data.inspectorName} · {data.date ? new Date(data.date).toLocaleDateString('es-PE') : ''}</Text>

      {(data.tires ?? []).map((t: any, i: number) => {
        const color = REC_COLOR[t.recommendation] ?? '#8892b0';
        return (
          <View key={i} style={[s.card, { borderLeftColor: color }]}>
            <View style={s.cardTop}>
              <Text style={s.pos}>{t.position}</Text>
              <Text style={[s.rec, { color }]}>{REC_LABEL[t.recommendation] ?? t.recommendation}</Text>
            </View>
            <Text style={[s.depth, { color }]}>{t.depth != null ? `${t.depth.toFixed(1)} mm` : 'Sin medición'} <Text style={s.depthSub}>(la menor)</Text></Text>
            {(t.depthInner != null || t.depthCenter != null || t.depthOuter != null) && (
              <Text style={s.zones}>Int {t.depthInner ?? '—'} · Centro {t.depthCenter ?? '—'} · Ext {t.depthOuter ?? '—'} mm</Text>
            )}
            {(t.brand || t.model) && <Text style={s.brand}>{t.brand} {t.model}</Text>}
            <Text style={s.line}>{t.size ?? ''}{t.code ? `  ·  🔥 ${t.code}` : ''}{t.life ? `  ·  ${t.life}` : ''}</Text>
            {(t.kmLife != null || t.kmTotal != null) && (
              <Text style={s.line}>🛣 Recorrido {km(t.kmLife)} · Acum. {km(t.kmTotal)} km</Text>
            )}
            {t.pressurePsi != null && <Text style={s.line}>Presión: {t.pressurePsi} PSI</Text>}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0d1117' },
  center:{ flex:1, backgroundColor:'#0d1117', alignItems:'center', justifyContent:'center' },
  muted:{ color:'#8892b0' },
  plate:{ fontSize:26, fontWeight:'800', color:'#58a6ff', letterSpacing:2 },
  vehicle:{ fontSize:15, color:'#e6f1ff', marginTop:2 },
  meta:{ fontSize:12, color:'#8892b0', marginTop:2, marginBottom:14 },
  card:{ backgroundColor:'#161b22', borderRadius:12, padding:14, marginBottom:10, borderLeftWidth:4, borderWidth:1, borderColor:'#30363d' },
  cardTop:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  pos:{ fontSize:13, fontWeight:'700', color:'#8892b0', textTransform:'uppercase' },
  rec:{ fontSize:12, fontWeight:'700' },
  depth:{ fontSize:24, fontWeight:'800', marginTop:4 },
  depthSub:{ fontSize:12, fontWeight:'400', color:'#8892b0' },
  zones:{ fontSize:12, color:'#8892b0', marginTop:2 },
  brand:{ fontSize:14, color:'#e6f1ff', fontWeight:'700', marginTop:6 },
  line:{ fontSize:12, color:'#8892b0', marginTop:2 },
});
