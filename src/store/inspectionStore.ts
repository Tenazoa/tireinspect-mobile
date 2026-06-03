import { create } from 'zustand';
import { generateUUID as uuidv4 } from '../utils/uuid';
import type { Inspection, TireInspection, TirePosition, Vehicle } from '../types';
import { saveInspection } from '../services/storage/database';

interface InspectionState {
  currentInspection: Inspection | null;
  startInspection: (vehicle: Vehicle, inspectorId: string) => void;
  updateTire: (position: TirePosition, data: Partial<TireInspection>) => Promise<void>;
  completeInspection: () => Promise<void>;
  discardInspection: () => void;
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  currentInspection: null,

  startInspection: (vehicle, inspectorId) => {
    const tires: TireInspection[] = vehicle.tirePositions.map((position) => ({
      id: uuidv4() as string,
      inspectionId: '',
      position,
      photos: [],
      recommendation: 'ok',
      inspectedAt: new Date().toISOString(),
    }));

    const inspectionId = uuidv4() as string;
    const inspection: Inspection = {
      id: inspectionId,
      vehicleId: vehicle.id,
      vehicle,
      inspectorId,
      status: 'draft',
      tires: tires.map((t) => ({ ...t, inspectionId })),
      createdAt: new Date().toISOString(),
    };

    set({ currentInspection: inspection });
    saveInspection(inspection).catch(console.error);
  },

  updateTire: async (position, data) => {
    const { currentInspection } = get();
    if (!currentInspection) return;

    const updatedTires = currentInspection.tires.map((t) =>
      t.position === position ? { ...t, ...data } : t
    );
    const updated = { ...currentInspection, tires: updatedTires };
    set({ currentInspection: updated });
    await saveInspection(updated);
  },

  completeInspection: async () => {
    const { currentInspection } = get();
    if (!currentInspection) return;

    const completed: Inspection = {
      ...currentInspection,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    set({ currentInspection: completed });
    await saveInspection(completed);
  },

  discardInspection: () => set({ currentInspection: null }),
}));
