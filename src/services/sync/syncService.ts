import { getPendingInspections, markInspectionSynced } from '../storage/database';
import { syncInspection } from '../api/inspections';

export async function syncPendingInspections(): Promise<number> {
  const pending = await getPendingInspections();
  let synced = 0;

  for (const inspection of pending) {
    try {
      await syncInspection(inspection);
      await markInspectionSynced(inspection.id);
      synced++;
    } catch (err) {
      console.warn('Sync failed for inspection', inspection.id, err);
    }
  }
  return synced;
}
