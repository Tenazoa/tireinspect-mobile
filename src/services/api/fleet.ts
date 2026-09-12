import { apiClient } from './client';

export interface FleetTireSpec {
  position: string;
  brand: string | null;
  model: string | null;
  size: string | null;
  lastDepthMm: number | null;
  code: string | null;
  life: string | null;
  kmTotal?: number | null;
  kmLife?: number | null;
  pressurePsi?: number | null;
  projectedDepthMm?: number | null;   // cocada estimada HOY por km recorrido
  kmDriven?: number | null;            // km desde la última medida
}

export interface PendienteInspeccion {
  plate: string;
  kmRecorrido: number;
  ultimaInspeccion: string | null;
  cocadaMinActual: number | null;
  cocadaMinEstimada: number | null;
  llantas: number;
}

/** Unidades que rodaron > umbral km desde su última inspección. */
export async function getPendientesInspeccion(km = 8000): Promise<{ total: number; items: PendienteInspeccion[] }> {
  try {
    const { data } = await apiClient.get(`/fleet/pendientes-inspeccion?km=${km}`);
    return data ?? { total: 0, items: [] };
  } catch {
    return { total: 0, items: [] };
  }
}

/** Trae las llantas conocidas de una placa (autollenado desde SOLOMON). */
export async function getFleetTires(plate: string): Promise<FleetTireSpec[]> {
  try {
    const { data } = await apiClient.get(`/fleet/${encodeURIComponent(plate)}`);
    return data ?? [];
  } catch {
    return [];
  }
}
