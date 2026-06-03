import { create } from 'zustand';
import { generateUUID as uuidv4 } from '../utils/uuid';
import type { Inspection, TireInspection, TirePosition, Vehicle } from '../types';
import { saveInspection } from '../services/storage/database';
import { getFleetTires, type FleetTireSpec } from '../services/api/fleet';

interface InspectionState {
  currentInspection: Inspection | null;
  startInspection: (vehicle: Vehicle, inspectorId: string) => Promise<void>;
  updateTire: (position: TirePosition, data: Partial<TireInspection>) => Promise<void>;
  completeInspection: () => Promise<void>;
  discardInspection: () => void;
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  currentInspection: null,

  startInspection: async (vehicle, inspectorId) => {
    // Autollenado: traer llantas conocidas de SOLOMON por placa
    let specs: FleetTireSpec[] = [];
    try { specs = await getFleetTires(vehicle.plate); } catch {}
    const byPos: Record<string, FleetTireSpec> = {};
    specs.forEach((s) => { byPos[s.position] = s; });

    // Posiciones: usar las de SOLOMON si existen, si no las del vehículo
    const positions = specs.length > 0 ? specs.map((s) => s.position) : vehicle.tirePositions;

    const tires: TireInspection[] = positions.map((position) => {
      const spec = byPos[position];
      return {
        id: uuidv4() as string,
        inspectionId: '',
        position,
        brand: spec?.brand ?? undefined,
        model: spec?.model ?? undefined,
        size: spec?.size ?? undefined,
        photos: [],
        recommendation: 'ok',
        inspectedAt: new Date().toISOString(),
      };
    });

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
