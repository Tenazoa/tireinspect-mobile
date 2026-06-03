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
