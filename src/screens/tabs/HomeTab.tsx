import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { getRecentInspections } from '../../services/storage/database';
import type { Inspection } from '../../types';

const REC_COLOR: Record<string,string> = { ok:'#3fb950', monitor:'#d29922', replace_soon:'#f78166', replace_now:'#e94560' };
const REC_LABEL: Record<string,string> = { ok:'OK', monitor:'Vigilar', replace_soon:'Cambio próximo', replace_now:'Urgente' };

export default function HomeTab() {
  const navigation = useNavigation<any>();
  const { inspector } = useAuthStore();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => setInspections(await getRecentInspections(10));
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const worstRec = (i: Inspection) => {
    for (const r of ['replace_now','replace_soon','monitor','ok'])
      if (i.tires.some(t => t.recommendation === r)) return r;
    return 'ok';
  };

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#58a6ff" />}>
      <View style={s.hero}>
        <Text style={s.saludo}>{saludo},</Text>
        <Text style={s.nombre}>{inspector?.name ?? 'Inspector'}</Text>
        <Text style={s.empresa}>{inspector?.company}</Text>
      </View>

      <TouchableOpacity style={s.mainBtn} onPress={() => navigation.navigate('Inspeccionar')}>
        <Text style={s.mainBtnIcon}>🔍</Text>
        <View>
          <Text style={s.mainBtnTitle}>Nueva inspección</Text>
          <Text style={s.mainBtnSub}>Buscar vehículo por placa</Text>
        </View>
      </TouchableOpacity>

      <View style={s.statsRow}>
        {[
          { label:'Hoy', value: inspections.filter(i => i.createdAt?.startsWith(new Date().toISOString().slice(0,10))).length },
          { label:'Esta semana', value: inspections.filter(i => (Date.now()-new Date(i.createdAt).getTime()) < 7*86400000).length },
          { label:'Total local', value: inspections.length },
        ].map(stat => (
          <View key={stat.label} style={s.statCard}>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Text style={s.sectionTitle}>Inspecciones recientes</Text>
      {inspections.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>Aún no hay inspecciones.</Text>
          <Text style={s.emptyHint}>Toca "Nueva inspección" para empezar.</Text>
        </View>
      ) : inspections.map(insp => {
        const rec = worstRec(insp);
        const color = REC_COLOR[rec];
        return (
          <View key={insp.id} style={[s.inspCard, { borderLeftColor: color }]}>
            <View style={s.inspTop}>
              <Text style={s.inspPlate}>{insp.vehicle?.plate ?? '—'}</Text>
              <View style={[s.badge, { backgroundColor: color+'22' }]}>
                <Text style={[s.badgeText, { color }]}>{REC_LABEL[rec]}</Text>
              </View>
            </View>
            <Text style={s.inspVehicle}>{insp.vehicle?.brand} {insp.vehicle?.model} · {insp.vehicle?.year}</Text>
            <Text style={s.inspMeta}>{insp.tires.length} llantas · {new Date(insp.createdAt).toLocaleDateString('es-PE')}</Text>
            {insp.status !== 'synced' && <Text style={s.syncPending}>⏳ Pendiente de sincronizar</Text>}
          </View>
        );
      })}
      <View style={{ height:40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0d1117' },
  hero:{ padding:20, paddingBottom:12 },
  saludo:{ fontSize:14, color:'#8892b0' },
  nombre:{ fontSize:26, fontWeight:'800', color:'#e6f1ff' },
  empresa:{ fontSize:13, color:'#8892b0', marginTop:2 },
  mainBtn:{ margin:16, backgroundColor:'#1f6feb', borderRadius:14, padding:18, flexDirection:'row', alignItems:'center', gap:14 },
  mainBtnIcon:{ fontSize:28 },
  mainBtnTitle:{ fontSize:17, fontWeight:'700', color:'#fff' },
  mainBtnSub:{ fontSize:12, color:'#a8d4ff', marginTop:2 },
  statsRow:{ flexDirection:'row', marginHorizontal:16, gap:10, marginBottom:8 },
  statCard:{ flex:1, backgroundColor:'#161b22', borderRadius:10, padding:14, alignItems:'center', borderWidth:1, borderColor:'#30363d' },
  statValue:{ fontSize:24, fontWeight:'800', color:'#58a6ff' },
  statLabel:{ fontSize:11, color:'#8892b0', marginTop:2 },
  sectionTitle:{ fontSize:12, color:'#8892b0', fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginHorizontal:16, marginTop:16, marginBottom:10 },
  emptyCard:{ margin:16, backgroundColor:'#161b22', borderRadius:12, padding:24, alignItems:'center', borderWidth:1, borderColor:'#30363d' },
  emptyText:{ color:'#8892b0', fontSize:15, marginBottom:6 },
  emptyHint:{ color:'#555', fontSize:13 },
  inspCard:{ marginHorizontal:16, marginBottom:10, backgroundColor:'#161b22', borderRadius:12, padding:14, borderLeftWidth:4, borderWidth:1, borderColor:'#30363d' },
  inspTop:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  inspPlate:{ fontSize:20, fontWeight:'800', color:'#58a6ff', letterSpacing:2 },
  badge:{ borderRadius:6, paddingHorizontal:8, paddingVertical:3 },
  badgeText:{ fontSize:11, fontWeight:'700' },
  inspVehicle:{ fontSize:13, color:'#e6f1ff', marginBottom:2 },
  inspMeta:{ fontSize:12, color:'#8892b0' },
  syncPending:{ fontSize:11, color:'#d29922', marginTop:4 },
});
