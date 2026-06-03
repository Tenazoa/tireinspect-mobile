import type { TireCondition, WearPattern } from '../types';

export function calcRecommendation(depthMm: number | null, pattern: WearPattern): TireCondition {
  // Patrón de desgaste irregular siempre amerita vigilancia mínima
  const patternPenalty = ['diagonal', 'cupping', 'patchy'].includes(pattern);

  if (depthMm === null) return patternPenalty ? 'monitor' : 'ok';

  if (depthMm <= 1.6) return 'replace_now';
  if (depthMm <= 2.5) return patternPenalty ? 'replace_now' : 'replace_soon';
  if (depthMm <= 4.0) return patternPenalty ? 'replace_soon' : 'monitor';
  return patternPenalty ? 'monitor' : 'ok';
}

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
