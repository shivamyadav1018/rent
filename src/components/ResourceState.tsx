import React from 'react';

import { AppButton } from './AppButton';
import { Screen } from './Screen';
import { Muted } from './Typography';

export function ResourceState({ loading, error, label, retry }: {
  loading: boolean;
  error: string;
  label: string;
  retry: () => void;
}) {
  return (
    <Screen>
      <Muted>{loading ? `Loading ${label}...` : error || `${label} not found.`}</Muted>
      {!loading ? <AppButton title="Retry" onPress={retry} /> : null}
    </Screen>
  );
}
