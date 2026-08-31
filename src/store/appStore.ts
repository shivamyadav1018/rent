import { create } from 'zustand';

import { propertyRepo } from '../database/repositories/propertyRepo';
import { rentRepo } from '../database/repositories/rentRepo';
import { settingsRepo } from '../database/repositories/settingsRepo';
import { tenantRepo } from '../database/repositories/tenantRepo';
import { unitRepo } from '../database/repositories/unitRepo';
import { rentCycleService } from '../services/rentCycleService';
import { DashboardSummary, LedgerItem, Property, Tenant, Unit } from '../types/models';
import { currentMonthYear } from '../utils/dates';

type AppState = {
  settings: Record<string, string>;
  onboardingDone: boolean;
  properties: Array<Property & { total_units?: number; occupied_units?: number }>;
  units: Array<Unit & { property_name?: string }>;
  tenants: Array<Tenant & { unit_name?: string; property_name?: string; current_status?: string }>;
  ledger: LedgerItem[];
  summary: DashboardSummary;
  bootstrap: () => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshLedger: (month?: number, year?: number, status?: string, propertyId?: string) => Promise<void>;
};

const emptySummary = {
  collectedRent: 0,
  expectedRent: 0,
  overdueCount: 0,
  pendingRent: 0,
};

export const useAppStore = create<AppState>((set, get) => ({
  ledger: [],
  onboardingDone: false,
  properties: [],
  settings: {},
  summary: emptySummary,
  tenants: [],
  units: [],

  async bootstrap() {
    const settings = await settingsRepo.getAll();
    set({ onboardingDone: settings.onboardingDone === 'true', settings });
    await get().refreshAll();
  },

  async refreshAll() {
    const [properties, units, tenants] = await Promise.all([
      propertyRepo.listWithCounts(),
      unitRepo.allWithProperty(),
      tenantRepo.list(),
    ]);
    set({ properties, tenants, units });
    const { month, year } = currentMonthYear();
    await get().refreshLedger(month, year);
  },

  async refreshLedger(month, year, status = 'all', propertyId) {
    const selected = month && year ? { month, year } : currentMonthYear();
    await rentCycleService.ensureCyclesForMonth(selected.month, selected.year);
    const ledger = await rentRepo.ledger(selected.month, selected.year, status, propertyId);
    const summary = ledger.reduce<DashboardSummary>((acc, item) => {
      acc.expectedRent += item.rent_amount;
      acc.collectedRent += item.total_paid;
      acc.pendingRent += Math.max(item.balance, 0);
      if (item.status === 'overdue') {
        acc.overdueCount += 1;
      }
      return acc;
    }, { ...emptySummary });

    set({ ledger, summary });
  },
}));
