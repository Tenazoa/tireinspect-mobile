import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useInspectionStore } from '../../store/inspectionStore';
import { TIRE_POSITION_LABELS } from '../../utils/constants';
import type { TirePosition } from '../../types';
import { syncPendingInspections } from '../../services/sync/syncService';

const REC_COLOR: Record<string,string> = { ok:'#3fb950', monitor:'#d29922', replace_soon:'#f78166', replace_now:'#e94560' };
const REC_LABEL: Record<string,string> = { ok:'OK', monitor:'Vigilar', replace_soon:'Cambio próximo', replace_now:'CAMBIO URGENTE' };

export default function InspectionReportScreen() {
  const navigation = useNavigation<any>();
  const { currentInspection, discardInspection } = useInspectionStore();

  if (!currentInspection) { navigation.navigate('Inicio'); return null; }
  const { vehicle, tires } = currentInspection;
  const critical = tires.filter(t => t.recommendation === 'replace_now').length;
  const soon = tires.filter(t => t.recommendation === 'replace_soon').length;

  const handleShare = async () => {
    const lines = [
      'REPORTE DE INSPECCIÓN - TireInspect',
      `Vehículo: ${vehicle?.plate} (${vehicle?.brand} ${vehicle?.model} ${vehicle?.year})`,
      `Fecha: ${new Date().toLocaleDateString('es-PE')}`, '',
      ...tires.map(t => `${TIRE_POSITION_LABELS[t.position as TirePosition]}: ${t.treadDepthCenter ? t.treadDepthCenter.toFixed(1)+'mm' : 'Sin med.'} — ${REC_LABEL[t.recommendation]}`),
      '', critical > 0 ? `⚠ ${critical} llanta(s) requieren cambio URGENTE` : '✓ Flota en buen estado general',
    ];
    await Share.share({ message: lines.join('\n'), title: `Inspección ${vehicle?.plate}` });
  };

  const handleFinish = async () => {
    try { await syncPendingInspections(); } catch {}
    discardInspection();
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  return (
    <ScrollView style={s.container}>
      <View style={[s.resultHeader, { backgroundColor: critical > 0 ? '#3d1f1f' : '#1a2e1a' }]}>
        <Text style={s.resultIcon}>{critical > 0 ? '⚠️' : '✅'}</Text>
        <Text style={s.resultTitle}>{critical > 0 ? `${critical} llanta(s) crítica(s)` : 'Inspección completada'}</Text>
        <Text style={s.resultSub}>{vehicle?.plate} · {vehicle?.brand} {vehicle?.model}</Text>
        <Text style={s.resultDate}>{new Date().toLocaleDateString('es-PE', { dateStyle: 'full' })}</Text>
      </View>

      <View style={s.summaryRow}>
        {[
          { label:'OK', count: tires.filter(t=>t.recommendation==='ok').length, color:'#3fb950' },
          { label:'Vigilar', count: tires.filter(t=>t.recommendation==='monitor').length, color:'#d29922' },
          { label:'Pronto', count: soon, color:'#f78166' },
          { label:'Urgente', count: critical, color:'#e94560' },
        ].map(item => (
          <View key={item.label} style={s.summaryCard}>
            <Text style={[s.summaryNum, { color: item.color }]}>{item.count}</Text>
            <Text style={s.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={s.sectionTitle}>Detalle por posición</Text>
      {tires.map(tire => {
        const color = REC_COLOR[tire.recommendation];
        return (
          <View key={tire.id} style={[s.tireCard, { borderLeftColor: color }]}>
            <View style={s.tireHeader}>
              <Text style={s.tirePos}>{TIRE_POSITION_LABELS[tire.position as TirePosition]}</Text>
              <View style={[s.badge, { backgroundColor: color+'22' }]}>
                <Text style={[s.badgeText, { color }]}>{REC_LABEL[tire.recommendation]}</Text>
              </View>
            </View>
            {tire.treadDepthCenter != null && <Text style={[s.depth, { color }]}>{tire.treadDepthCenter.toFixed(1)} mm</Text>}
            {tire.brand && <Text style={s.brand}>{tire.brand} {tire.model ?? ''} · {tire.size ?? ''}</Text>}
            {tire.pressurePsi && <Text style={s.meta}>Presión: {tire.pressurePsi} PSI</Text>}
            {tire.notes && <Text style={s.notes}>"{tire.notes}"</Text>}
          </View>
        );
      })}

      <View style={s.actions}>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
          <Text style={s.shareBtnText}>📤 Compartir reporte</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.finishBtn} onPress={handleFinish}>
          <Text style={s.finishBtnText}>Finalizar y volver al inicio</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height:40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#0d1117' },
  resultHeader:{ padding:24, alignItems:'center' },
  resultIcon:{ fontSize:40, marginBottom:8 },
  resultTitle:{ fontSize:22, fontWeight:'800', color:'#e6f1ff', textAlign:'center' },
  resultSub:{ fontSize:15, color:'#8892b0', marginTop:4 },
  resultDate:{ fontSize:12, color:'#555', marginTop:4 },
  summaryRow:{ flexDirection:'row', padding:16, gap:10 },
  summaryCard:{ flex:1, backgroundColor:'#161b22', borderRadius:10, padding:12, alignItems:'center', borderWidth:1, borderColor:'#30363d' },
  summaryNum:{ fontSize:26, fontWeight:'800' },
  summaryLabel:{ fontSize:11, color:'#8892b0', marginTop:2 },
  sectionTitle:{ fontSize:11, color:'#8892b0', fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginHorizontal:16, marginTop:8, marginBottom:10 },
  tireCard:{ marginHorizontal:16, marginBottom:10, backgroundColor:'#161b22', borderRadius:12, padding:14, borderLeftWidth:4, borderWidth:1, borderColor:'#30363d' },
  tireHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  tirePos:{ fontSize:15, fontWeight:'700', color:'#e6f1ff' },
  badge:{ borderRadius:6, paddingHorizontal:8, paddingVertical:3 },
  badgeText:{ fontSize:11, fontWeight:'700' },
  depth:{ fontSize:26, fontWeight:'800', marginVertical:4 },
  brand:{ fontSize:13, color:'#8892b0' },
  meta:{ fontSize:12, color:'#555', marginTop:2 },
  notes:{ fontSize:12, color:'#8892b0', fontStyle:'italic', marginTop:4 },
  actions:{ padding:16, gap:12 },
  shareBtn:{ backgroundColor:'#1f6feb', borderRadius:10, padding:16, alignItems:'center' },
  shareBtnText:{ color:'#fff', fontWeight:'700', fontSize:15 },
  finishBtn:{ backgroundColor:'#238636', borderRadius:10, padding:16, alignItems:'center' },
  finishBtnText:{ color:'#fff', fontWeight:'700', fontSize:15 },
});
