import { apiClient } from './client';
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
  const formData = new FormData();
  const filename = localUri.split('/').pop() ?? 'photo.jpg';
  formData.append('file', { uri: localUri, name: filename, type: 'image/jpeg' } as any);
  formData.append('tire_inspection_id', tireInspectionId);

  const { data } = await apiClient.post<{ url: string }>('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
