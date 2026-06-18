import { getPendingInspections, markInspectionSynced } from '../storage/database';
import { syncInspection, uploadPhoto } from '../api/inspections';

export async function syncPendingInspections(): Promise<number> {
  const pending = await getPendingInspections();
  let synced = 0;

  for (const inspection of pending) {
    try {
      // 1. Subir las fotos a la nube (para que persistan y se vean en la web)
      for (const tire of inspection.tires) {
        for (const photo of tire.photos ?? []) {
          if (photo.uri && !photo.uploadedUrl) {
            try {
              photo.uploadedUrl = await uploadPhoto(tire.id, photo.uri);
            } catch (e) {
              console.warn('No se pudo subir foto', photo.id, e);
            }
          }
        }
      }
      // 2. Sincronizar la inspección (con las URLs de las fotos subidas)
      await syncInspection(inspection);
      await markInspectionSynced(inspection.id);
      synced++;
    } catch (err) {
      console.warn('Sync failed for inspection', inspection.id, err);
    }
  }
  return synced;
}
