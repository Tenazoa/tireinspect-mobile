import { apiClient } from './client';
import type { Inspection } from '../../types';

export async function syncInspection(inspection: Inspection): Promise<void> {
  await apiClient.post('/inspections/sync', inspection);
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
