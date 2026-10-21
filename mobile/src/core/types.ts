export type Numeric = number | string | null;
export interface Project {
  estimateDetails?: Estimate | null;
  projectId: string; status: 'draft' | 'active'; completedStep: number;
  name: string; nameSource: 'auto' | 'user'; areaM2: number; address: string | null;
  currentState: string | null; targetState: string | null; finishLevel: string | null;
  otherRoomsRepair: boolean; roomsCount: number | null; kitchensCount: number; bathroomsCount: number; redevelopment: boolean;
  estimateStatus: string; budgetMinRub: number | null; budgetMaxRub: number | null;
  durationMinDays: number | null; durationMaxDays: number | null; version: number;
}
export interface Apartment {
  redevelopment?: boolean | null;
  currentState: string; targetState: string; finishLevel: string; areaM2: Numeric;
  ceilingHeight: Numeric; floor: string; walls: string; ceiling: string; doors: string;
  demolition: string; wallPreparation: string; floorPreparation: string; electrical: string;
}
export interface Room {
  id: string; type: string; name: string; areaM2: Numeric;
  floor: string; walls: string; ceiling: string; automatic: boolean;
}
export interface Kitchen {
  cabinets: string; lengthM: Numeric; facade: string; countertop: string;
  stove: string | null; oven: boolean | null; refrigerator: boolean | null;
  hood: boolean | null; dishwasher: boolean | null;
}
export interface Exterior {
  areaM2: Numeric; glazing: string; insulation: string; floor: string; walls: string;
  ceiling: string; lighting: boolean | null; sockets: boolean | null;
}
export interface SectionData {
  apartment: Apartment;
  rooms: { rooms: Room[]; roomCountManual: boolean };
  kitchen: Record<string, Kitchen>;
  exteriors: { presence: string; balcony: Exterior; loggia: Exterior };
}
export type Section = keyof SectionData;
export interface Draft<K extends Section = Section> {
  data: SectionData[K]; version: number; confirmedRemovals: string[];
}
export type Drafts = { [K in Section]?: Draft<K> };
export interface Totals { min: number; max: number; expected: number; withReserve: number }
export interface CostDetails {
 roughMaterials: number; finishMaterials: number; labor: number;
 lines: {section:string;name:string;priceCode:string;unit:string;quantity:number;unitPriceRub:number;coefficient:number;amountRub:number;source:string;priceDate:string}[];
}
export interface Estimate {
  details?: CostDetails | null;
  id: string; total: Totals; repair: Totals | null; kitchen: Totals | null;
  balconyIncluded: number; loggiaIncluded: number; reasons: string[]; assumptions: string[];
  pricingVersion: string; algorithmVersion: string;
}
export interface Snapshot {
  project: Project; revision: number; recommendedRoomCount: number;
  calculationStatus: string; calculationMessage: string; activeEstimateOutdated: boolean;
  activeEstimate: Estimate | null; candidateEstimate: Estimate | null;
  data: { apartment: Apartment; rooms: Room[]; roomCountManual: boolean;
    kitchens: Record<string, Kitchen>; exteriors: SectionData['exteriors']; completedSections: string[]; updatedSections?: string[] };
}
