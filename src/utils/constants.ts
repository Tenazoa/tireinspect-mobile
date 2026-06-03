import type { WearPattern } from '../types';

/**
 * Códigos de posición:
 *   FL, FR              → eje direccional (delantero, simple)
 *   A{n}{L|R}{O|I}      → eje n, lado Izq/Der, llanta Exterior/Interior (duales)
 *   RL, RR, RL2...      → posiciones simples legadas (autos/vans)
 *   SP{n}               → repuesto n
 */

// Generador de etiqueta legible a partir del código
export function tirePositionLabel(code: string): string {
  if (code === 'FL') return 'Direccional Izq.';
  if (code === 'FR') return 'Direccional Der.';
  if (code.startsWith('SP')) return `Repuesto ${code.slice(2)}`;

  const dual = code.match(/^A(\d)([LR])([OI])$/);
  if (dual) {
    const [, axle, side, pos] = dual;
    const lado = side === 'L' ? 'Izq.' : 'Der.';
    const ext = pos === 'O' ? 'Ext.' : 'Int.';
    return `Eje ${axle} ${lado} ${ext}`;
  }

  // Legadas
  const legacy: Record<string, string> = {
    RL: 'Trasera Izq.', RR: 'Trasera Der.',
    RL2: 'Trasera Izq. 2', RR2: 'Trasera Der. 2',
    RL3: 'Trasera Izq. 3', RR3: 'Trasera Der. 3',
  };
  return legacy[code] ?? code;
}

// Configuraciones reales de flota
const TRUCK_6X4 = [
  'FL', 'FR',                       // eje 1 direccional (simple)
  'A2LO', 'A2LI', 'A2RI', 'A2RO',   // eje 2 motriz (dual)
  'A3LO', 'A3LI', 'A3RI', 'A3RO',   // eje 3 motriz (dual)
]; // 10 llantas rodando

const TRAILER_6X0 = [
  'A1LO', 'A1LI', 'A1RI', 'A1RO',   // eje 1 (dual)
  'A2LO', 'A2LI', 'A2RI', 'A2RO',   // eje 2 (dual)
  'A3LO', 'A3LI', 'A3RI', 'A3RO',   // eje 3 (dual)
  'SP1', 'SP2',                     // 2 repuestos
]; // 12 rodando + 2 repuesto

export const VEHICLE_TYPE_POSITIONS: Record<string, string[]> = {
  car:        ['FL', 'FR', 'RL', 'RR'],
  van:        ['FL', 'FR', 'RL', 'RR'],
  truck:      TRUCK_6X4,
  trailer:    TRAILER_6X0,
  bus:        ['FL', 'FR', 'A2LO', 'A2LI', 'A2RI', 'A2RO'],
  motorcycle: ['FL', 'RL'],
};

// Mapa de etiquetas (cubre todas las posiciones usadas) — compat con código existente
const ALL_CODES = Array.from(new Set([
  'FL', 'FR', 'RL', 'RR', 'RL2', 'RR2', 'RL3', 'RR3',
  ...TRUCK_6X4, ...TRAILER_6X0,
]));
export const TIRE_POSITION_LABELS: Record<string, string> = Object.fromEntries(
  ALL_CODES.map(c => [c, tirePositionLabel(c)])
);

// Indica si una posición es repuesto (no rueda)
export function isSpare(code: string): boolean {
  return code.startsWith('SP');
}

export const WEAR_PATTERNS: { value: WearPattern; label: string }[] = [
  { value: 'uniform',    label: 'Uniforme' },
  { value: 'center',     label: 'Centro' },
  { value: 'edge_both',  label: 'Bordes' },
  { value: 'edge_inner', label: 'Borde interior' },
  { value: 'edge_outer', label: 'Borde exterior' },
  { value: 'diagonal',   label: 'Diagonal' },
  { value: 'cupping',    label: 'Ondulado' },
  { value: 'patchy',     label: 'Irregular' },
];

export const TIRE_SIZES = [
  '295/80R22.5', '315/80R22.5', '385/65R22.5', '11R22.5', '12R22.5',
  '275/80R22.5', '295/75R22.5', '11R24.5',
  '195/65R15', '205/55R16', '215/60R17', '225/75R16',
];

export const TIRE_BRANDS = [
  'Michelin', 'Bridgestone', 'Goodyear', 'Continental',
  'Pirelli', 'Dunlop', 'Hankook', 'Yokohama', 'Toyo',
  'Nexen', 'Kumho', 'Cooper', 'Firestone', 'BFGoodrich',
];
