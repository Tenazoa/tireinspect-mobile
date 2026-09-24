import * as SecureStore from 'expo-secure-store';
import { apiClient, getApiBase } from './client';
import type { Inspection } from '../../types';

export async function syncInspection(inspection: Inspection): Promise<void> {
  await apiClient.post('/inspections/sync', inspection);
}

// Lista de inspecciones desde el backend (para verlas aunque se reinstale la app)
export async function fetchCloudInspections(): Promise<any[]> {
  try {
    const { data } = await apiClient.get('/inspections');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Detalle de una inspección (llantas con código, marca, medidas, etc.)
export async function fetchInspectionDetail(id: string): Promise<any | null> {
  try {
    const { data } = await apiClient.get(`/inspections/${id}/detail`);
    return data;
  } catch {
    return null;
  }
}

export async function uploadPhoto(tireInspectionId: string, localUri: string): Promise<string> {
  // Se usa fetch directo (no axios): React Native arma el multipart con su boundary
  // correcto. Con axios el header 'Content-Type' quedaba mal y FastAPI daba 422,
  // por lo que la foto NO se subía y quedaba guardada la ruta local (file://).
  const base = await getApiBase();
  const token = await SecureStore.getItemAsync('auth_token');
  const form = new FormData();
  const filename = (localUri.split('/').pop() || 'photo.jpg').split('?')[0];
  form.append('file', { uri: localUri, name: filename, type: 'image/jpeg' } as any);
  form.append('tire_inspection_id', tireInspectionId);

  const res = await fetch(`${base}/api/v1/photos/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) throw new Error(`Subida de foto falló (${res.status})`);
  const data = await res.json();
  return data.url as string;
}
