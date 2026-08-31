export type PropertyType = 'house' | 'flat' | 'room' | 'shop' | 'PG';
export type UnitStatus = 'vacant' | 'occupied';
export type TenantStatus = 'active' | 'inactive';
export type RentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';

export type Property = {
  id: string;
  name: string;
  type: PropertyType;
  address?: string | null;
  created_at: string;
  updated_at: string;
};

export type Unit = {
  id: string;
  property_id: string;
  name: string;
  monthly_rent: number;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
};

export type Tenant = {
  id: string;
  unit_id: string;
  name: string;
  phone: string;
  monthly_rent: number;
  due_day: number;
  move_in_date: string;
  security_deposit: number;
  status: TenantStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type RentCycle = {
  id: string;
  tenant_id: string;
  month: number;
  year: number;
  rent_amount: number;
  due_date: string;
  total_paid: number;
  balance: number;
  status: RentStatus;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  rent_cycle_id: string;
  tenant_id: string;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode;
  reference_no?: string | null;
  notes?: string | null;
  created_at: string;
};

export type LedgerItem = RentCycle & {
  tenant_name: string;
  tenant_phone: string;
  unit_name: string;
  property_name: string;
};

export type DashboardSummary = {
  expectedRent: number;
  collectedRent: number;
  pendingRent: number;
  overdueCount: number;
};
