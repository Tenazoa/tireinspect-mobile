import type { TireCondition, WearPattern } from '../types';

export function calcRecommendation(
  depthMm: number | null,
  pattern: WearPattern,
  opts?: { vehicleType?: string; position?: string },
): TireCondition {
  if (depthMm === null) {
    return ['diagonal', 'cupping', 'patchy'].includes(pattern) ? 'monitor' : 'ok';
  }
  // Umbrales TYMSAC: delanteras tracto (P01/P02) <=5 urgente; posteriores/carretas <=3 urgente
  const front = opts?.vehicleType === 'truck' && (opts?.position === 'P01' || opts?.position === 'P02');
  const crit = front ? 5.0 : 3.0;
  if (depthMm <= crit) return 'replace_now';
  if (depthMm < 6.0) return 'replace_soon';   // 4-6 próximo a cambiar
  return 'ok';                                 // >=6 óptimo
}

export const MAX_TREAD_MM = 24;

export function conditionScore(depthMm: number): number {
  // 0-100 basado en profundidad. Nueva llanta ~8mm = 100
  return Math.round(Math.min((depthMm / 8) * 100, 100));
}

export function remainingLifePct(depthMm: number): number {
  // Límite legal 1.6mm, nueva ~8mm → rango útil 6.4mm
  const usable = 8 - 1.6;
  const remaining = Math.max(depthMm - 1.6, 0);
  return Math.round((remaining / usable) * 100);
}

export function formatDotDate(dot: string): string | null {
  // Los últimos 4 dígitos del DOT son semana+año: e.g. "1523" = semana 15, 2023
  const match = dot.replace(/\s/g, '').match(/(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, week, year] = match;
  return `Sem. ${week} / 20${year}`;
}
