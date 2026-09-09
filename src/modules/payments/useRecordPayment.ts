import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { z } from 'zod';

import { rentRepo } from '../../database/repositories/rentRepo';
import { tenantRepo } from '../../database/repositories/tenantRepo';
import { rentCycleService } from '../../services/rentCycleService';
import { useAppStore } from '../../store/appStore';
import { PaymentMode, RentCycle, Tenant } from '../../types/models';
import { currentMonthYear, todayDate, isValidDate } from '../../utils/dates';

export const paymentModes: PaymentMode[] = ['cash', 'upi', 'bank_transfer', 'cheque', 'other'];
const paymentSchema = z.coerce.number().positive('Amount must be greater than zero');
const electricitySchema = z.coerce.number().min(0, 'Electricity amount cannot be negative');

export function useRecordPayment(params?: { tenantId?: string; cycleId?: string }) {
  const current = currentMonthYear();
  const refreshAll = useAppStore(state => state.refreshAll);
  const [activeTenants, setActiveTenants] = useState<(Tenant & { unit_name?: string; property_name?: string })[]>([]);
  const [tenantError, setTenantError] = useState('');
  const [tenantAttempt, setTenantAttempt] = useState(0);
  const [selectionAttempt, setSelectionAttempt] = useState(0);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [tenantId, setTenantId] = useState(params?.tenantId ?? '');
  const [cycle, setCycle] = useState<RentCycle | null>(null);
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [amount, setAmount] = useState('');
  const [electricityAmount, setElectricityAmount] = useState('0');
  const [paymentDate, setPaymentDate] = useState(todayDate());
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [selectionReady, setSelectionReady] = useState(!params?.cycleId);
  const [loadingCycle, setLoadingCycle] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cycleError, setCycleError] = useState('');
  const [savedCycleId, setSavedCycleId] = useState<string | null>(null);

  // Refresh after returning from the tenant form so newly created tenants appear immediately.
  useFocusEffect(useCallback(() => {
    let isActive = true;
    setLoadingTenants(true);
    setTenantError('');
    tenantRepo.list('', Boolean(params?.cycleId))
      .then(tenants => { if (isActive) setActiveTenants(tenants); })
      .catch(() => { if (isActive) setTenantError('Could not load tenants. Please retry.'); })
      .finally(() => { if (isActive) setLoadingTenants(false); });
    return () => { isActive = false; };
    // Retrying must rerun this request even when the selected cycle is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.cycleId, tenantAttempt]));

  useEffect(() => {
    const cycleId = params?.cycleId as string | undefined;
    if (!cycleId) return;
    let isActive = true;
    setSelectionReady(false);
    setCycleError('');
    rentRepo.findLedgerItem(cycleId).then(item => {
      if (!isActive) return;
      if (!item) throw new Error('Rent cycle not found');
      setTenantId(item.tenant_id); setMonth(item.month); setYear(item.year);
      setSelectionReady(true);
    }).catch(error => { if (isActive) setCycleError(error instanceof Error ? error.message : 'Could not load rent cycle'); });
    return () => { isActive = false; };
  }, [params?.cycleId, selectionAttempt]);

  useEffect(() => {
    if (!tenantId || !selectionReady) return;
    setCycle(null);
    setAmount('');
    setCycleError('');
    setLoadingCycle(true);
    let isActive = true;
    rentCycleService.ensureCycleForTenant(tenantId, month, year).then(next => {
      if (!isActive) return;
      setCycle(next);
      if (next) {
        setAmount(String(Math.max(next.balance, 0)));
        setElectricityAmount(String(next.electricity_amount ?? 0));
      }
      else setCycleError('No rent cycle is available for this month.');
    }).catch(() => {
      if (isActive) setCycleError('Could not load the rent balance. Please retry.');
    }).finally(() => { if (isActive) setLoadingCycle(false); });
    return () => { isActive = false; };
  }, [month, retryCount, selectionReady, tenantId, year]);

  const changeMonth = (delta: number) => {
    if (savingRef.current || !selectionReady) return;
    setAmount('');
    const next = new Date(year, month - 1 + delta, 1); setMonth(next.getMonth() + 1); setYear(next.getFullYear()); setCycle(null);
  };

  const save = async () => {
    if (savingRef.current) return;
    const parsedAmount = paymentSchema.safeParse(amount);
    const parsedElectricity = electricitySchema.safeParse(electricityAmount);
    if (!tenantId) return Alert.alert('Select a tenant');
    if (!parsedAmount.success) return Alert.alert('Check amount', parsedAmount.error.issues[0]?.message);
    if (!parsedElectricity.success) return Alert.alert('Check electricity', parsedElectricity.error.issues[0]?.message);
    if (!isValidDate(paymentDate)) return Alert.alert('Check date', 'Enter a valid payment date (YYYY-MM-DD)');
    if (!cycle || loadingCycle) return Alert.alert('Wait for the rent balance to load');
    savingRef.current = true;
    setSaving(true);
    try {
      // paymentDate stored as plain YYYY-MM-DD (no UTC conversion) consistent with dates.ts fix
      const updated = await rentCycleService.recordPayment({ amount: parsedAmount.data, electricityAmount: parsedElectricity.data, month, notes, paymentDate, paymentMode: mode, referenceNo, tenantId, year });
      if (updated) { setCycle(updated); setSavedCycleId(updated.id); }
      refreshAll().catch(() => undefined);
    } catch (error) {
      Alert.alert('Could not record payment', error instanceof Error ? error.message : 'Please try again.');
    } finally { savingRef.current = false; setSaving(false); }
  };

  const selectTenant = (id: string) => {
    if (savingRef.current || !selectionReady || tenantId === id) return;
    setTenantId(id);
    setCycle(null);
    setAmount('');
  };
  const selectMode = (value: PaymentMode) => { if (!savingRef.current) setMode(value); };
  const retryCycle = () => {
    if (selectionReady) setRetryCount(count => count + 1);
    else setSelectionAttempt(count => count + 1);
  };

  return {
    activeTenants, loadingTenants, tenantError, retryTenants: () => setTenantAttempt(count => count + 1),
    tenantId, selectTenant, cycle, month, year, changeMonth, amount, setAmount,
    electricityAmount, setElectricityAmount,
    paymentDate, setPaymentDate, mode, selectMode, referenceNo, setReferenceNo,
    notes, setNotes, saving, selectionReady, loadingCycle, cycleError, retryCycle,
    savedCycleId, save,
  };
}
