import { create } from 'zustand';
import { generateUUID as uuidv4 } from '../utils/uuid';
import type { Inspection, TireInspection, TirePosition, Vehicle } from '../types';
import { saveInspection, markInspectionSynced } from '../services/storage/database';
import { getFleetTires, type FleetTireSpec } from '../services/api/fleet';
import { syncInspection } from '../services/api/inspections';

// Recomendación según la cocada conocida (llanta de camión).
function recFromDepth(mm?: number): TireInspection['recommendation'] {
  if (mm == null) return 'ok';
  if (mm < 3) return 'replace_now';
  if (mm < 5) return 'replace_soon';
  if (mm < 7) return 'monitor';
  return 'ok';
}

interface InspectionState {
  currentInspection: Inspection | null;
  startInspection: (vehicle: Vehicle, inspectorId: string) => Promise<void>;
  updateTire: (position: TirePosition, data: Partial<TireInspection>) => Promise<void>;
  completeInspection: () => Promise<void>;
  // Guarda la inspección de TODA la unidad de una vez, con la cocada conocida
  // de SOLOMON (sin ir llanta por llanta). Devuelve nº de llantas guardadas.
  saveGlobalInspection: (vehicle: Vehicle, inspectorId: string) => Promise<number>;
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
        dotCode: spec?.code ?? undefined,
        pressurePsi: spec?.pressurePsi ?? undefined,
        // cocada estimada por km como valor conocido de partida (autollenado)
        knownDepthMm: spec?.projectedDepthMm ?? spec?.lastDepthMm ?? undefined,
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

  saveGlobalInspection: async (vehicle, inspectorId) => {
    let specs: FleetTireSpec[] = [];
    try { specs = await getFleetTires(vehicle.plate); } catch {}
    const byPos: Record<string, FleetTireSpec> = {};
    specs.forEach((s) => { byPos[s.position] = s; });
    const positions = specs.length > 0 ? specs.map((s) => s.position) : vehicle.tirePositions;

    const now = new Date().toISOString();
    const inspectionId = uuidv4() as string;
    const tires: TireInspection[] = positions.map((position) => {
      const spec = byPos[position];
      // cocada ESTIMADA por km recorrido (si no, la última conocida)
      const depth = spec?.projectedDepthMm ?? spec?.lastDepthMm ?? undefined;
      return {
        id: uuidv4() as string,
        inspectionId,
        position,
        brand: spec?.brand ?? undefined,
        model: spec?.model ?? undefined,
        size: spec?.size ?? undefined,
        dotCode: spec?.code ?? undefined,
        pressurePsi: spec?.pressurePsi ?? undefined,
        knownDepthMm: spec?.lastDepthMm ?? undefined,
        treadDepthCenter: depth,   // cocada estimada por desgaste como medición
        photos: [],
        recommendation: recFromDepth(depth),
        inspectedAt: now,
      } as TireInspection;
    });

    const inspection: Inspection = {
      id: inspectionId,
      vehicleId: vehicle.id,
      vehicle,
      inspectorId,
      status: 'completed',
      tires,
      createdAt: now,
      completedAt: now,
    };
    set({ currentInspection: inspection });
    await saveInspection(inspection);
    // Subir al backend de una vez (best-effort; si falla, el syncService lo reintenta)
    try { await syncInspection(inspection); await markInspectionSynced(inspection.id); } catch {}
    return tires.length;
  },

  discardInspection: () => set({ currentInspection: null }),
}));
