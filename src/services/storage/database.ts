/**
 * Storage service usando AsyncStorage (compatible con Expo Go).
 * En producción con build nativa se puede migrar a expo-sqlite
 * para mejor rendimiento con datasets grandes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Vehicle, Inspection, TireInspection } from '../../types';

const KEYS = {
  vehicles:    'ti_vehicles',
  inspections: 'ti_inspections',
};

// ── Helpers genéricos ───────────────────────────────────────────────────────

async function getAll<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

async function saveAll<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

// ── Vehicles ────────────────────────────────────────────────────────────────

export async function upsertVehicle(vehicle: Vehicle): Promise<void> {
  const all = await getAll<Vehicle>(KEYS.vehicles);
  const idx = all.findIndex(v => v.id === vehicle.id);
  if (idx >= 0) all[idx] = vehicle;
  else all.unshift(vehicle);
  await saveAll(KEYS.vehicles, all);
}

export async function searchVehiclesByPlate(query: string): Promise<Vehicle[]> {
  const all = await getAll<Vehicle>(KEYS.vehicles);
  const q = query.toUpperCase();
  return all.filter(v => v.plate.includes(q)).slice(0, 10);
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const all = await getAll<Vehicle>(KEYS.vehicles);
  return all.find(v => v.id === id) ?? null;
}

// ── Inspections ─────────────────────────────────────────────────────────────

export async function saveInspection(inspection: Inspection): Promise<void> {
  const all = await getAll<Inspection>(KEYS.inspections);
  const idx = all.findIndex(i => i.id === inspection.id);
  if (idx >= 0) all[idx] = inspection;
  else all.unshift(inspection);
  await saveAll(KEYS.inspections, all);
}

export async function saveTireInspection(tire: TireInspection): Promise<void> {
  const all = await getAll<Inspection>(KEYS.inspections);
  const insp = all.find(i => i.id === tire.inspectionId);
  if (!insp) return;
  const tIdx = insp.tires.findIndex(t => t.id === tire.id);
  if (tIdx >= 0) insp.tires[tIdx] = tire;
  else insp.tires.push(tire);
  await saveAll(KEYS.inspections, all);
}

export async function getRecentInspections(limit = 20): Promise<Inspection[]> {
  const all = await getAll<Inspection>(KEYS.inspections);
  return all
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getInspectionsByVehicle(vehicleId: string): Promise<Inspection[]> {
  const all = await getAll<Inspection>(KEYS.inspections);
  return all
    .filter(i => i.vehicleId === vehicleId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPendingInspections(): Promise<Inspection[]> {
  const all = await getAll<Inspection>(KEYS.inspections);
  return all.filter(i => i.status === 'completed');
}

export async function markInspectionSynced(id: string): Promise<void> {
  const all = await getAll<Inspection>(KEYS.inspections);
  const insp = all.find(i => i.id === id);
  if (insp) {
    insp.status = 'synced';
    insp.syncedAt = new Date().toISOString();
    await saveAll(KEYS.inspections, all);
  }
}
