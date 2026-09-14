import React, { useCallback } from 'react';
import { AppButton } from '../../components/AppButton';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { ResourceState } from '../../components/ResourceState';
import { Body, Muted, Title } from '../../components/Typography';
import { useFocusedResource } from '../../hooks/useFocusedResource';
import { settlementRepo } from '../../database/repositories/settlementRepo';
import { SettlementStatement } from '../../types/models';
import { formatCurrency } from '../../utils/currency';

export function SettlementsScreen({ navigation }: any) {
  const resource = useFocusedResource(useCallback(() => settlementRepo.all(), []));
  if (resource.loading || !resource.data) return <ResourceState loading={resource.loading} error={resource.error} retry={resource.retry} label="settlements" />;
  const pending = resource.data.filter(row => !row.transfer_date);
  const refunds = pending.reduce((sum, row) => sum + Math.max(-row.balance, 0), 0);
  const collections = pending.reduce((sum, row) => sum + Math.max(row.balance, 0), 0);
  return <Screen><Title>Move-out settlements</Title>
    <Card><Body>To collect: {formatCurrency(collections)}</Body><Body>To refund: {formatCurrency(refunds)}</Body><Muted>These balances are separate from monthly rent dues.</Muted></Card>
    {!resource.data.length ? <Muted>No settlements yet. Open a tenant and choose Move out / settle deposit.</Muted> : null}
    {resource.data.map(row => {
      const statement: SettlementStatement = JSON.parse(row.statement_json);
      return <Card key={row.id}>
        <Body>{statement.tenantName} · {statement.propertyName} / {statement.unitName}</Body>
        <Muted>Moved out {statement.moveOutDate}</Muted>
        <Body>{row.transfer_date ? 'Completed' : row.balance > 0 ? 'Collection pending' : 'Refund pending'} · {formatCurrency(Math.abs(row.balance))}</Body>
        <AppButton title="View settlement" variant="secondary" onPress={() => navigation.navigate('MoveOut', { tenantId: row.tenant_id })} />
        <AppButton title="Tenant history" variant="secondary" onPress={() => navigation.navigate('TenantDetail', { tenantId: row.tenant_id })} />
      </Card>;
    })}
  </Screen>;
}
