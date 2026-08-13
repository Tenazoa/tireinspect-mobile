import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useInspectionStore } from '../../store/inspectionStore';
import { TIRE_POSITION_LABELS } from '../../utils/constants';
import type { TirePosition } from '../../types';
import { syncPendingInspections } from '../../services/sync/syncService';

const REC_COLOR: Record<string,string> = { ok:'#3fb950', monitor:'#d29922', replace_soon:'#f78166', replace_now:'#e94560' };
const REC_LABEL: Record<string,string> = { ok:'OK', monitor:'Vigilar', replace_soon:'Cambio próximo', replace_now:'CAMBIO URGENTE' };

// Etiqueta de posición: usa el nombre si existe, si no el código (P01, RPT, etc.)
const posLabel = (code: string) => TIRE_POSITION_LABELS[code as TirePosition] ?? code;
// Profundidad principal = la MENOR de las 3 zonas
const minDepth = (t: any): number | null => {
  const vals = [t.treadDepthInner, t.treadDepthCenter, t.treadDepthOuter].filter((v: any) => v != null && v !== '');
  return vals.length ? Math.min(...vals.map(Number)) : null;
};

export default function InspectionReportScreen() {
  const navigation = useNavigation<any>();
  const { currentInspection, discardInspection } = useInspectionStore();

  if (!currentInspection) { navigation.navigate('Inicio'); return null; }
  const { vehicle, tires } = currentInspection;
  const critical = tires.filter(t => t.recommendation === 'replace_now').length;
  const soon = tires.filter(t => t.recommendation === 'replace_soon').length;

  const buildHtml = () => {
    const rows = tires.map(t => {
      const d = minDepth(t);
      const color = REC_COLOR[t.recommendation] || '#334155';
      const zonas = [t.treadDepthInner, t.treadDepthCenter, t.treadDepthOuter]
        .map((v: any) => (v != null && v !== '' ? Number(v).toFixed(0) : '—')).join(' · ');
      return `<tr>
        <td class="pos">${posLabel(t.position)}</td>
        <td class="depth" style="color:${color}"><b>${d != null ? d.toFixed(1) + ' mm' : 'Sin med.'}</b></td>
        <td class="zonas">${zonas}</td>
        <td>${t.brand || ''} ${t.model || ''}</td>
        <td><span class="badge" style="background:${color}22;color:${color}">${REC_LABEL[t.recommendation]}</span></td>
      </tr>`;
    }).join('');
    const estado = critical > 0
      ? `<div class="alert crit">⚠ ${critical} llanta(s) requieren cambio URGENTE</div>`
      : `<div class="alert ok">✓ Flota en buen estado general</div>`;
    return `<html><head><meta charset="utf-8"><style>
      *{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}
      body{margin:0;color:#1e293b}
      .hdr{background:#0f2050;color:#fff;padding:22px 26px}
      .hdr h1{margin:0;font-size:22px}
      .hdr p{margin:4px 0 0;color:#9fd3ff;font-size:13px}
      .meta{padding:16px 26px;background:#f1f5f9;font-size:13px}
      .meta b{color:#0f2050}
      table{width:100%;border-collapse:collapse;margin:0 26px;width:calc(100% - 52px)}
      th{background:#e2e8f0;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#475569}
      td{padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px}
      td.pos{font-weight:700;color:#0f2050}
      td.depth{font-size:15px}
      td.zonas{color:#64748b;font-size:12px}
      .badge{padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700}
      .alert{margin:18px 26px;padding:12px 16px;border-radius:10px;font-weight:700}
      .alert.crit{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
      .alert.ok{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
      .foot{padding:14px 26px;color:#94a3b8;font-size:11px}
    </style></head><body>
      <div class="hdr"><h1>🛞 TYMSAC — Reporte de Inspección</h1><p>Sistema de control de neumáticos</p></div>
      <div class="meta">
        <b>Vehículo:</b> ${vehicle?.plate} (${vehicle?.brand || ''} ${vehicle?.model || ''} ${vehicle?.year || ''})<br>
        <b>Fecha:</b> ${new Date().toLocaleDateString('es-PE', { dateStyle: 'full' })}<br>
        <b>Llantas inspeccionadas:</b> ${tires.length}
      </div>
      ${estado}
      <table><thead><tr><th>Posición</th><th>Cocada (menor)</th><th>Int·Cen·Ext</th><th>Marca / Modelo</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="foot">Generado por el sistema de control de neumáticos TYMSAC · ${new Date().toLocaleString('es-PE')}</div>
    </body></html>`;
  };

  const handleShare = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml() });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Inspección ${vehicle?.plate}`, UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Compartir', 'No se pudo abrir el menú de compartir.');
      }
    } catch (e) {
      Alert.alert('PDF', 'No se pudo generar el PDF. Reintenta.');
    }
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
              <Text style={s.tirePos}>{posLabel(tire.position)}</Text>
              <View style={[s.badge, { backgroundColor: color+'22' }]}>
                <Text style={[s.badgeText, { color }]}>{REC_LABEL[tire.recommendation]}</Text>
              </View>
            </View>
            {minDepth(tire) != null && <Text style={[s.depth, { color }]}>{minDepth(tire)!.toFixed(1)} mm <Text style={s.meta}>(menor)</Text></Text>}
            {tire.brand && <Text style={s.brand}>{tire.brand} {tire.model ?? ''} · {tire.size ?? ''}</Text>}
            {tire.pressurePsi && <Text style={s.meta}>Presión: {tire.pressurePsi} PSI</Text>}
            {tire.notes && <Text style={s.notes}>"{tire.notes}"</Text>}
          </View>
        );
      })}

      <View style={s.actions}>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
          <Text style={s.shareBtnText}>📄 Compartir PDF</Text>
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
