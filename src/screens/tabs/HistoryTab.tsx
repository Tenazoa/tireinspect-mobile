import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getRecentInspections } from '../../services/storage/database';
import { fetchCloudInspections } from '../../services/api/inspections';
import type { Inspection } from '../../types';

const REC_COLOR: Record<string,string> = { ok:'#3fb950', monitor:'#d29922', replace_soon:'#f78166', replace_now:'#e94560' };
const REC_LABEL: Record<string,string> = { ok:'OK', monitor:'Vigilar', replace_soon:'Cambio próximo', replace_now:'Urgente' };

export default function HistoryTab() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Inspection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    const local = await getRecentInspections(50);
    const byId: Record<string, any> = {};
    // primero la nube (resumen), luego local sobreescribe (tiene llantas completas)
    const cloud = await fetchCloudInspections();
    for (const c of cloud) {
      byId[c.id] = {
        id: c.id,
        createdAt: c.completedAt || c.createdAt,
        vehicle: { plate: c.plate, brand: c.vehicleLabel, model: '' },
        tires: Array.from({ length: c.tireCount || 0 }, (_, i) => ({
          id: `${c.id}-${i}`, position: '', recommendation: c.criticalCount > 0 ? 'replace_now' : 'ok',
        })),
        _cloud: true, criticalCount: c.criticalCount,
      };
    }
    for (const l of local) byId[l.id] = l;
    const merged = Object.values(byId).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setItems(merged as Inspection[]);
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const worstRec = (i: Inspection) => {
    for (const r of ['replace_now','replace_soon','monitor','ok'])
      if (i.tires.some(t => t.recommendation === r)) return r;
    return 'ok';
  };
  return (
    <FlatList style={s.container} data={items} keyExtractor={i => i.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#58a6ff" />}
      ListHeaderComponent={<View style={s.header}><Text style={s.title}>Historial</Text><Text style={s.sub}>{items.length} inspecciones guardadas</Text></View>}
      ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>Sin inspecciones registradas</Text></View>}
      renderItem={({ item }) => {
        const rec = worstRec(item); const color = REC_COLOR[rec];
        return (
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('InspectionView', { id: item.id })} style={[s.card, { borderLeftColor: color }]}>
            <View style={s.cardTop}>
              <Text style={s.plate}>{item.vehicle?.plate ?? '—'}</Text>
              <View style={[s.badge, { backgroundColor: color+'22' }]}>
                <Text style={[s.badgeText, { color }]}>{REC_LABEL[rec]}</Text>
              </View>
            </View>
            <Text style={s.vehicle}>{item.vehicle?.brand} {item.vehicle?.model}</Text>
            <Text style={s.meta}>{item.tires.length} llantas · {new Date(item.createdAt).toLocaleDateString('es-PE')}</Text>
            <View style={s.depths}>
              {item.tires.filter(t => t.treadDepthCenter).map(t => (
                <View key={t.id} style={[s.chip, { borderColor: REC_COLOR[t.recommendation]+'55' }]}>
                  <Text style={s.chipPos}>{t.position}</Text>
                  <Text style={[s.chipVal, { color: REC_COLOR[t.recommendation] }]}>{t.treadDepthCenter?.toFixed(1)}mm</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={{ paddingBottom:40 }}
    />
  );
}
const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0d1117' },
  header:{ padding:20, paddingBottom:10 },
  title:{ fontSize:24, fontWeight:'700', color:'#e6f1ff' },
  sub:{ fontSize:13, color:'#8892b0', marginTop:2 },
  empty:{ padding:40, alignItems:'center' },
  emptyText:{ color:'#8892b0', fontSize:15 },
  card:{ marginHorizontal:16, marginBottom:10, backgroundColor:'#161b22', borderRadius:12, padding:14, borderLeftWidth:4, borderWidth:1, borderColor:'#30363d' },
  cardTop:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  plate:{ fontSize:20, fontWeight:'800', color:'#58a6ff', letterSpacing:2 },
  badge:{ borderRadius:6, paddingHorizontal:8, paddingVertical:3 },
  badgeText:{ fontSize:11, fontWeight:'700' },
  vehicle:{ fontSize:13, color:'#e6f1ff', marginBottom:2 },
  meta:{ fontSize:12, color:'#8892b0', marginBottom:8 },
  depths:{ flexDirection:'row', flexWrap:'wrap', gap:6 },
  chip:{ borderWidth:1, borderRadius:6, paddingHorizontal:8, paddingVertical:4, alignItems:'center' },
  chipPos:{ fontSize:9, color:'#8892b0', textTransform:'uppercase' },
  chipVal:{ fontSize:13, fontWeight:'700' },
});
