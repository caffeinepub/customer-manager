export interface RecurringJob {
  id: string;
  customerId: string;
  addressId: string;
  title: string;
  description: string;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly";
  dayOfWeek?: number; // 0-6
  startDate: string; // ISO date
  endDate?: string;
  isActive: boolean;
  nextOccurrence: string; // ISO date
  notes?: string;
  createdAt: string;
}

export interface JobTemplate {
  id: string;
  name: string;
  description: string;
  estimatedHours: number;
  laborRate: number;
  defaultMaterials: Array<{ name: string; quantity: number; unitCost: number }>;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface EstimateLineItem {
  id: string;
  estimateId: string;
  type: "labor" | "material" | "fee" | "discount" | "other";
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Estimate {
  id: string;
  customerId: string;
  addressId: string;
  title: string;
  description: string;
  status: "draft" | "sent" | "accepted" | "declined" | "expired";
  lineItems: EstimateLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  validUntil?: string;
  convertedJobId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpReminder {
  id: string;
  customerId: string;
  jobId?: string;
  dueDate: string; // ISO date
  note: string;
  isDone: boolean;
  createdAt: string;
}

export interface MileageLog {
  id: string;
  jobId?: string;
  visitId?: string;
  date: string; // ISO date
  startLocation: string;
  endLocation: string;
  distanceMiles: number;
  purpose: string;
  notes?: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: "vehicle" | "tool" | "equipment" | "other";
  make: string;
  model: string;
  year?: number;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  status: "active" | "in_repair" | "retired";
  notes?: string;
  createdAt: string;
}
