import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Image, Alert, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { generateUUID as uuidv4 } from '../../utils/uuid';
import { useInspectionStore } from '../../store/inspectionStore';
import { TIRE_POSITION_LABELS, WEAR_PATTERNS } from '../../utils/constants';
import type { TirePosition, WearPattern, TirePhoto } from '../../types';
import { calcRecommendation } from '../../utils/tireUtils';
import {
  analyzeTirePhoto, measureWithReference, wearLevelColor, confidenceLabel,
  type AIAnalysisResult, type MeasurementResult,
} from '../../services/ai/tireAI';

const REC_COLOR: Record<string, string> = {
  ok: '#3fb950', monitor: '#d29922', replace_soon: '#f78166', replace_now: '#e94560',
};
const REC_LABEL: Record<string, string> = {
  ok: '✓ OK', monitor: '⚠ Vigilar', replace_soon: '↑ Cambio próximo', replace_now: '✕ Urgente',
};
const PATTERN_CAUSE: Record<string, string> = {
  center: 'Posible inflado excesivo', edge_both: 'Posible inflado insuficiente',
  edge_inner: 'Revisar alineación', edge_outer: 'Revisar convergencia',
  cupping: 'Revisar amortiguadores', diagonal: 'Revisar alineación',
  uniform: '', patchy: 'Desgaste irregular',
};

const REFERENCES = [
  { id: 'coin_pen_1', label: 'Moneda S/1' },
  { id: 'coin_pen_050', label: 'Moneda S/0.50' },
  { id: 'card', label: 'Tarjeta' },
];

export default function TireInspectionScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { currentInspection, updateTire } = useInspectionStore();

  const position: TirePosition = route.params.position;
  const tire = currentInspection?.tires.find((t) => t.position === position);

  const [brand, setBrand] = useState(tire?.brand ?? '');
  const [size, setSize] = useState(tire?.size ?? '');
  const [dotCode, setDotCode] = useState(tire?.dotCode ?? '');
  const [inner, setInner] = useState(tire?.treadDepthInner?.toString() ?? '');
  const [center, setCenter] = useState(tire?.treadDepthCenter?.toString() ?? '');
  const [outer, setOuter] = useState(tire?.treadDepthOuter?.toString() ?? '');
  const [pressure, setPressure] = useState(tire?.pressurePsi?.toString() ?? '');
  const [pattern, setPattern] = useState<WearPattern>(tire?.wearPattern ?? 'uniform');
  const [notes, setNotes] = useState(tire?.notes ?? '');
  const [photos, setPhotos] = useState<TirePhoto[]>(tire?.photos ?? []);
  const [saving, setSaving] = useState(false);

  // IA + medición
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [measureResult, setMeasureResult] = useState<MeasurementResult | null>(null);
  const [measureLoading, setMeasureLoading] = useState(false);
  const [refType, setRefType] = useState('coin_pen_1');

  if (!tire) { navigation.goBack(); return null; }

  const depths = [inner, center, outer].map(Number).filter(Boolean);
  const avgDepth = depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : null;
  const recommendation = calcRecommendation(avgDepth, pattern);
  const recColor = REC_COLOR[recommendation];

  const takePhoto = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Se necesita la cámara.'); return null; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false });
    if (result.canceled || !result.assets[0]) return null;
    const uri = result.assets[0].uri;
    setPhotos(prev => [...prev, { id: uuidv4(), uri, type: 'tread', capturedAt: new Date().toISOString() }]);
    return uri;
  };

  // Foto + análisis IA (Fase 2)
  const handleAnalyze = async () => {
    const uri = await takePhoto();
    if (!uri) return;
    setAiLoading(true); setAiResult(null);
    try {
      const a = await analyzeTirePhoto(uri, currentInspection?.id ?? 'x', position, avgDepth ?? undefined, brand || undefined, size || undefined);
      setAiResult(a);
      if (a.isTireDetected) {
        // Llenar las 3 zonas medidas por la IA: interior / centro / exterior
        if (a.depthInnerMm > 0) setInner(a.depthInnerMm.toFixed(1));
        if (a.depthCenterMm > 0) setCenter(a.depthCenterMm.toFixed(1));
        if (a.depthOuterMm > 0) setOuter(a.depthOuterMm.toFixed(1));
        if (a.wearPattern !== 'uniform' && pattern === 'uniform') setPattern(a.wearPattern);
      }
    } catch {
      Alert.alert('Sin conexión', 'No se pudo analizar. Revisa tu conexión.');
    } finally { setAiLoading(false); }
  };

  // Foto con moneda + medición real (Fase 3)
  const handleMeasure = async () => {
    const uri = await takePhoto();
    if (!uri) return;
    setMeasureLoading(true); setMeasureResult(null);
    try {
      const m = await measureWithReference(uri, refType);
      setMeasureResult(m);
      if (m.success && m.measuredDepthMm != null) setCenter(m.measuredDepthMm.toFixed(1));
    } catch {
      Alert.alert('Sin conexión', 'No se pudo medir. Revisa tu conexión.');
    } finally { setMeasureLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    await updateTire(position, {
      brand: brand || undefined, size: size || undefined, dotCode: dotCode || undefined,
      treadDepthInner: inner ? Number(inner) : undefined,
      treadDepthCenter: center ? Number(center) : undefined,
      treadDepthOuter: outer ? Number(outer) : undefined,
      pressurePsi: pressure ? Number(pressure) : undefined,
      wearPattern: pattern, notes: notes || undefined, photos, recommendation,
      conditionScore: avgDepth ? Math.round((avgDepth / 8) * 100) : aiResult?.conditionScore,
    });
    setSaving(false);
    navigation.goBack();
  };

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Text style={s.posLabel}>{TIRE_POSITION_LABELS[position]}</Text>
        <View style={[s.recBadge, { backgroundColor: recColor + '22' }]}>
          <Text style={[s.recText, { color: recColor }]}>{REC_LABEL[recommendation]}</Text>
        </View>
      </View>

      {/* Captura con IA */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Captura con análisis</Text>
        <View style={s.btnRow}>
          <TouchableOpacity style={[s.captureBtn, { backgroundColor: '#1f6feb' }]} onPress={handleAnalyze}>
            <Text style={s.captureBtnIcon}>📷</Text>
            <Text style={s.captureBtnText}>Foto + IA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.captureBtn, { backgroundColor: '#8957e5' }]} onPress={handleMeasure}>
            <Text style={s.captureBtnIcon}>🪙</Text>
            <Text style={s.captureBtnText}>Medir con moneda</Text>
          </TouchableOpacity>
        </View>

        {/* Selector de referencia */}
        <View style={s.refRow}>
          <Text style={s.refLabel}>Referencia:</Text>
          {REFERENCES.map(r => (
            <TouchableOpacity key={r.id} style={[s.refChip, refType === r.id && s.refChipActive]} onPress={() => setRefType(r.id)}>
              <Text style={[s.refChipText, refType === r.id && s.refChipTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {photos.map(p => <Image key={p.id} source={{ uri: p.uri }} style={s.thumb} />)}
          </ScrollView>
        )}
      </View>

      {/* Resultado IA */}
      {aiLoading && <Loading text="Analizando con IA..." />}
      {aiResult && !aiLoading && (
        <View style={[s.resultCard, { borderColor: wearLevelColor(aiResult.wearLevel) + '66' }]}>
          <View style={s.resultHeader}>
            <Text style={s.resultTitle}>🤖 Análisis IA</Text>
            <Text style={[s.resultConf, { color: aiResult.confidence >= 0.75 ? '#3fb950' : '#d29922' }]}>
              {confidenceLabel(aiResult.confidence)}
            </Text>
          </View>
          {!aiResult.isTireDetected ? (
            <Text style={s.warn}>⚠ No se detectó llanta. Toma otra foto más cercana.</Text>
          ) : (
            <>
              <View style={s.metricsRow}>
                <Metric label="Interior" value={`${aiResult.depthInnerMm.toFixed(1)} mm`} color={wearLevelColor(aiResult.wearLevel)} sub="" />
                <Metric label="Centro" value={`${aiResult.depthCenterMm.toFixed(1)} mm`} color={wearLevelColor(aiResult.wearLevel)} sub="" />
                <Metric label="Exterior" value={`${aiResult.depthOuterMm.toFixed(1)} mm`} color={wearLevelColor(aiResult.wearLevel)} sub="" />
              </View>
              <View style={s.metricsRow}>
                <Metric label="Condición" value={`${aiResult.conditionScore}/100`} color={wearLevelColor(aiResult.wearLevel)} sub={aiResult.wearLevelLabel} />
              </View>
              {aiResult.wearPattern !== 'uniform' && (
                <Text style={s.patternNote}>Patrón: {aiResult.wearPattern} · {PATTERN_CAUSE[aiResult.wearPattern]}</Text>
              )}
              {aiResult.defects.length > 0 && (
                <Text style={s.defects}>⚠ Defectos: {aiResult.defects.join(', ')}</Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Resultado medición */}
      {measureLoading && <Loading text="Midiendo con referencia..." />}
      {measureResult && !measureLoading && (
        <View style={[s.resultCard, { borderColor: '#8957e566' }]}>
          <Text style={s.resultTitle}>🪙 Medición con referencia</Text>
          {measureResult.success && measureResult.measuredDepthMm != null ? (
            <>
              <Text style={[s.bigDepth, { color: REC_COLOR[measureResult.recommendation ?? 'ok'] }]}>
                {measureResult.measuredDepthMm.toFixed(1)} mm
              </Text>
              <Text style={s.measureNote}>{measureResult.referenceLabel} · {confidenceLabel(measureResult.confidence)}</Text>
              <Text style={s.measureHint}>Valor aplicado al campo "Centro" abajo</Text>
            </>
          ) : (
            <Text style={s.warn}>⚠ {measureResult.notes}</Text>
          )}
        </View>
      )}

      {/* Profundidad manual */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Profundidad de surco (mm)</Text>
        <View style={s.depthRow}>
          {[['Interior', inner, setInner], ['Centro', center, setCenter], ['Exterior', outer, setOuter]].map(([label, val, setVal]) => (
            <View key={label as string} style={s.depthField}>
              <Text style={s.depthLabel}>{label as string}</Text>
              <TextInput style={s.depthInput} value={val as string} onChangeText={setVal as any} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor="#555" />
            </View>
          ))}
        </View>
      </View>

      {/* Patrón */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Patrón de desgaste</Text>
        <View style={s.patternGrid}>
          {WEAR_PATTERNS.map(({ value, label }) => (
            <TouchableOpacity key={value} style={[s.patternChip, pattern === value && s.patternChipActive]} onPress={() => setPattern(value as WearPattern)}>
              <Text style={[s.patternText, pattern === value && s.patternTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Datos */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Datos de la llanta</Text>
        {[
          { label: 'Marca', val: brand, set: setBrand, ph: 'Michelin...' },
          { label: 'Medida', val: size, set: setSize, ph: '295/80R22.5' },
          { label: 'Código DOT', val: dotCode, set: setDotCode, ph: 'XXXX 0124' },
          { label: 'Presión (PSI)', val: pressure, set: setPressure, ph: '110', num: true },
        ].map(f => (
          <View key={f.label} style={s.field}>
            <Text style={s.fieldLabel}>{f.label}</Text>
            <TextInput style={s.fieldInput} value={f.val} onChangeText={f.set} placeholder={f.ph} placeholderTextColor="#555" keyboardType={f.num ? 'numeric' : 'default'} />
          </View>
        ))}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Observaciones</Text>
        <TextInput style={[s.fieldInput, s.notesInput]} value={notes} onChangeText={setNotes} placeholder="Golpes, cortes..." placeholderTextColor="#555" multiline numberOfLines={3} />
      </View>

      <TouchableOpacity style={[s.saveBtn, saving && s.btnOff]} onPress={handleSave} disabled={saving}>
        <Text style={s.saveBtnText}>{saving ? 'Guardando...' : 'Guardar llanta ✓'}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <View style={s.loadingBox}>
      <ActivityIndicator color="#58a6ff" size="small" />
      <Text style={s.loadingText}>{text}</Text>
    </View>
  );
}

function Metric({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricVal, { color }]}>{value}</Text>
      {sub ? <Text style={s.metricSub}>{sub}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#161b22', borderBottomWidth: 1, borderBottomColor: '#30363d' },
  posLabel: { fontSize: 18, fontWeight: '700', color: '#e6f1ff' },
  recBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  recText: { fontSize: 13, fontWeight: '700' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#161b22' },
  sectionTitle: { fontSize: 11, color: '#8892b0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 10 },
  captureBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  captureBtnIcon: { fontSize: 26, marginBottom: 4 },
  captureBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  refRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  refLabel: { color: '#8892b0', fontSize: 12 },
  refChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d' },
  refChipActive: { backgroundColor: '#8957e5', borderColor: '#a371f7' },
  refChipText: { color: '#8892b0', fontSize: 12 },
  refChipTextActive: { color: '#fff', fontWeight: '600' },
  thumb: { width: 80, height: 80, borderRadius: 10, marginRight: 8 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, padding: 12, backgroundColor: '#161b22', borderRadius: 10 },
  loadingText: { color: '#8892b0', fontSize: 14 },
  resultCard: { margin: 16, backgroundColor: '#161b22', borderRadius: 12, padding: 16, borderWidth: 1 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: '#e6f1ff' },
  resultConf: { fontSize: 12, fontWeight: '700' },
  warn: { color: '#d29922', fontSize: 13 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  metric: { flex: 1, backgroundColor: '#21262d', borderRadius: 8, padding: 12 },
  metricLabel: { fontSize: 11, color: '#8892b0', marginBottom: 4 },
  metricVal: { fontSize: 22, fontWeight: '800' },
  metricSub: { fontSize: 11, color: '#8892b0', marginTop: 2 },
  patternNote: { fontSize: 12, color: '#d29922', marginTop: 4 },
  defects: { fontSize: 12, color: '#f78166', marginTop: 6 },
  bigDepth: { fontSize: 36, fontWeight: '800', marginVertical: 4 },
  measureNote: { fontSize: 12, color: '#8892b0' },
  measureHint: { fontSize: 11, color: '#58a6ff', marginTop: 6 },
  depthRow: { flexDirection: 'row', gap: 12 },
  depthField: { flex: 1 },
  depthLabel: { fontSize: 12, color: '#8892b0', marginBottom: 6 },
  depthInput: { backgroundColor: '#161b22', borderRadius: 8, padding: 12, color: '#e6f1ff', fontSize: 20, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: '#30363d' },
  patternGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  patternChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#161b22', borderWidth: 1, borderColor: '#30363d' },
  patternChipActive: { backgroundColor: '#1f6feb', borderColor: '#58a6ff' },
  patternText: { color: '#8892b0', fontSize: 13 },
  patternTextActive: { color: '#e6f1ff', fontWeight: '600' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, color: '#8892b0', marginBottom: 6 },
  fieldInput: { backgroundColor: '#161b22', borderRadius: 10, padding: 13, color: '#e6f1ff', fontSize: 15, borderWidth: 1, borderColor: '#30363d' },
  notesInput: { height: 80, textAlignVertical: 'top' },
  saveBtn: { margin: 16, backgroundColor: '#238636', borderRadius: 10, padding: 16, alignItems: 'center' },
  btnOff: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
