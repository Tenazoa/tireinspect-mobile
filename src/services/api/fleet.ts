import { apiClient } from './client';

export interface FleetTireSpec {
  position: string;
  brand: string | null;
  model: string | null;
  size: string | null;
  lastDepthMm: number | null;
  code: string | null;
  life: string | null;
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
