import { apiClient } from '../api/client';
import type { TireCondition, WearPattern } from '../../types';

export interface AIAnalysisResult {
  isTireDetected: boolean;
  wearLevel: 'new' | 'low' | 'medium' | 'high' | 'replace' | 'unknown';
  wearLevelLabel: string;
  confidence: number;
  conditionScore: number;
  estimatedDepthMm: number;
  wearPattern: WearPattern;
  patternConfidence: number;
  defects: string[];
  recommendation: TireCondition;
  analysisNotes: string;
}

export async function analyzeTirePhoto(
  photoUri: string,
  inspectionId: string,
  position: string,
  manualDepthMm?: number,
  tireBrand?: string,
  tireSize?: string,
): Promise<AIAnalysisResult> {
  const formData = new FormData();
  const filename = photoUri.split('/').pop() ?? 'tire.jpg';

  formData.append('file', {
    uri: photoUri,
    name: filename,
    type: 'image/jpeg',
  } as any);
  formData.append('inspection_id', inspectionId);
  formData.append('position', position);
  if (manualDepthMm !== undefined) formData.append('manual_depth_mm', String(manualDepthMm));
  if (tireBrand) formData.append('tire_brand', tireBrand);
  if (tireSize) formData.append('tire_size', tireSize);

  const { data } = await apiClient.post('/ai/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 20000,
  });

  return {
    isTireDetected: data.is_tire_detected,
    wearLevel: data.wear_level,
    wearLevelLabel: data.wear_level_label,
    confidence: data.confidence,
    conditionScore: data.condition_score,
    estimatedDepthMm: data.estimated_depth_mm,
    wearPattern: data.wear_pattern,
    patternConfidence: data.pattern_confidence,
    defects: data.defects ?? [],
    recommendation: data.recommendation,
    analysisNotes: data.analysis_notes,
  };
}

export function wearLevelColor(level: string): string {
  return {
    new:     '#3fb950',
    low:     '#3fb950',
    medium:  '#d29922',
    high:    '#f78166',
    replace: '#e94560',
    unknown: '#8892b0',
  }[level] ?? '#8892b0';
}

export function confidenceLabel(conf: number): string {
  if (conf >= 0.85) return 'Alta confianza';
  if (conf >= 0.65) return 'Confianza media';
  return 'Baja confianza';
}

// ── Fase 3: Medición con objeto de referencia ───────────────────────────────

export interface ReferenceObject {
  id: string;
  label: string;
  real_mm: number;
  shape: string;
}

export interface MeasurementResult {
  success: boolean;
  referenceDetected: boolean;
  referenceLabel: string;
  measuredDepthMm: number | null;
  recommendation: TireCondition | null;
  confidence: number;
  notes: string;
}

export async function getReferenceObjects(): Promise<ReferenceObject[]> {
  const { data } = await apiClient.get('/ai/reference-objects');
  return data;
}

export async function measureWithReference(
  photoUri: string,
  referenceType: string = 'coin_pen_1',
): Promise<MeasurementResult> {
  const formData = new FormData();
  const filename = photoUri.split('/').pop() ?? 'tire.jpg';
  formData.append('file', { uri: photoUri, name: filename, type: 'image/jpeg' } as any);
  formData.append('reference_type', referenceType);

  const { data } = await apiClient.post('/ai/measure', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 25000,
  });

  return {
    success: data.success,
    referenceDetected: data.reference_detected,
    referenceLabel: data.reference_label,
    measuredDepthMm: data.measured_depth_mm,
    recommendation: data.recommendation,
    confidence: data.confidence,
    notes: data.notes,
  };
}
