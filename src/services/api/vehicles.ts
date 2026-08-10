import { apiClient } from './client';
import { upsertVehicle } from '../storage/database';
import type { Vehicle } from '../../types';

export async function searchVehicleByPlateAPI(plate: string): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[]>('/vehicles/search', {
    params: { plate: plate.toUpperCase() },
  });
  // Cache local para uso offline futuro
  await Promise.all(data.map(upsertVehicle));
  return data;
}

export async function createVehicle(payload: Omit<Vehicle, 'id' | 'createdAt' | 'lastInspection'>): Promise<Vehicle> {
  const { data } = await apiClient.post<Vehicle>('/vehicles', payload);
  await upsertVehicle(data);
  return data;
}

export async function syncVehicles(): Promise<void> {
  const { data } = await apiClient.get<Vehicle[]>('/vehicles/my-fleet');
  await Promise.all(data.map(upsertVehicle));
}

// Trae toda la flota (para mostrar las placas en la pantalla de inspección).
// Render (plan gratis) se duerme: la 1ra llamada puede tardar/expirar.
// Reintenta con espera para que la flota cargue en vez de quedar vacía.
export async function fetchMyFleet(): Promise<Vehicle[]> {
  let lastErr: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await apiClient.get<Vehicle[]>('/vehicles/my-fleet');
      await Promise.all(data.map(upsertVehicle));
      return data;
    } catch (e) {
      lastErr = e;
      // Espera creciente mientras el servidor despierta (2s, 4s)
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  // Falló tras reintentos: propaga para que la pantalla ofrezca "Reintentar"
  throw lastErr ?? new Error('No se pudo cargar la flota');
}
