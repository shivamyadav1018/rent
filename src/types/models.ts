export type PropertyType = 'house' | 'flat' | 'room' | 'shop' | 'PG';
export type UnitStatus = 'vacant' | 'occupied';
export type TenantStatus = 'active' | 'inactive';
export type TenantInviteStatus = 'active' | 'cancelled' | 'expired' | 'used';

export type TenantInvite = {
  id: string;
  code: string;
  property_id: string;
  unit_id: string;
  tenant_name?: string | null;
  tenant_phone: string;
  status: TenantInviteStatus;
  expires_at: string;
  last_shared_at?: string | null;
  created_at: string;
  updated_at: string;
  owner_id?: string | null;
  deleted_at?: string | null;
  sync_status?: SyncStatus;
  version?: number;
};
export type RentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'settled';
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export type SyncMetadata = {
  owner_id?: string | null;
  deleted_at?: string | null;
  sync_status?: SyncStatus;
  version?: number;
};

export type Property = SyncMetadata & {
  id: string;
  name: string;
  type: PropertyType;
  address?: string | null;
  created_at: string;
  updated_at: string;
};

export type Unit = SyncMetadata & {
  id: string;
  property_id: string;
  name: string;
  monthly_rent: number;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
};

export type Tenant = SyncMetadata & {
  settlement_id?: string | null;
  id: string;
  unit_id: string;
  name: string;
  phone: string;
  monthly_rent: number;
  electricity_amount: number;
  due_day: number;
  move_in_date: string;
  security_deposit: number;
  id_proof_name?: string | null;
  id_proof_storage_path?: string | null;
  id_proof_mime_type?: string | null;
  status: TenantStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type RentCycle = SyncMetadata & {
  id: string;
  tenant_id: string;
  month: number;
  year: number;
  rent_amount: number;
  electricity_amount: number;
  total_payable: number;
  due_date: string;
  total_paid: number;
  balance: number;
  status: RentStatus;
  created_at: string;
  updated_at: string;
};

export type Payment = SyncMetadata & {
  receipt_rent?: number | null;
  receipt_electricity?: number | null;
  receipt_balance?: number | null;
  receipt_tenant?: string | null;
  receipt_property?: string | null;
  receipt_unit?: string | null;
  receipt_landlord?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;

  id: string;
  rent_cycle_id: string;
  tenant_id: string;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode;
  reference_no?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type LedgerItem = RentCycle & {
  settlement_id?: string | null;
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

export type SettlementStatement = {
  tenantName: string; propertyName: string; unitName: string; phone: string;
  moveOutDate: string; deposit: number; finalRent: number; finalElectricity: number;
  deduction: number; deductionReason: string; previousBalance: number; finalPayments: number;
  balance: number; bills: { month: number; year: number; rent: number; electricity: number; paid: number }[];
};

export type Settlement = SyncMetadata & {
  id: string; tenant_id: string; statement_json: string; balance: number;
  transfer_date?: string | null; transfer_mode?: PaymentMode | null; transfer_reference?: string | null;
  created_at: string; updated_at: string;
};
