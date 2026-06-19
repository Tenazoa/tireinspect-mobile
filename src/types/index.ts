export type VehicleType = 'truck' | 'trailer' | 'bus' | 'van' | 'car' | 'motorcycle';

// Códigos: FL/FR (direccional), A{n}{L|R}{O|I} (duales), RL.. (legado), SP{n} (repuesto)
export type TirePosition = string;

export type WearPattern =
  | 'uniform'
  | 'center'
  | 'edge_both'
  | 'edge_inner'
  | 'edge_outer'
  | 'diagonal'
  | 'cupping'
  | 'patchy';

export type TireCondition = 'ok' | 'monitor' | 'replace_soon' | 'replace_now';

export type InspectionStatus = 'draft' | 'completed' | 'synced';

export interface Vehicle {
  id: string;
  plate: string;
  vin?: string;
  brand: string;
  model: string;
  year: number;
  type: VehicleType;
  axleCount: number;
  tirePositions: TirePosition[];
  ownerCompany?: string;
  createdAt: string;
  lastInspection?: string;
}

export interface TirePhoto {
  id: string;
  uri: string;               // local URI (file://)
  uploadedUrl?: string;      // URL remota tras sync
  type: 'tread' | 'sidewall' | 'full' | 'dot';
  capturedAt: string;
}

export interface TireInspection {
  id: string;
  inspectionId: string;
  position: TirePosition;
  brand?: string;
  model?: string;
  size?: string;
  dotCode?: string;
  manufactureDate?: string;
  treadDepthInner?: number;   // mm
  treadDepthCenter?: number;  // mm
  treadDepthOuter?: number;   // mm
  wearPattern?: WearPattern;
  conditionScore?: number;    // 0-100
  remainingLifePct?: number;
  pressurePsi?: number;
  knownDepthMm?: number;
  photos: TirePhoto[];
  recommendation: TireCondition;
  notes?: string;
  inspectedAt: string;
}

export interface Inspection {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  inspectorId: string;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  odometerKm?: number;
  status: InspectionStatus;
  tires: TireInspection[];
  createdAt: string;
  completedAt?: string;
  syncedAt?: string;
}

export interface Inspector {
  id: string;
  name: string;
  email: string;
  company: string;
  role: 'inspector' | 'supervisor' | 'admin';
  token?: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'inspection' | 'photo';
  entityId: string;
  payload: string; // JSON serializado
  attempts: number;
  lastAttempt?: string;
  createdAt: string;
}
