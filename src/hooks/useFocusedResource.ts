import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Callers memoize load so edits to unrelated form fields do not restart the request.
export function useFocusedResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    const fetch = async () => {
      try {
        const result = await load();
        if (active) setData(result);
      } catch (failure) {
        if (active) {
          setData(null);
          setError(failure instanceof Error ? failure.message : 'Could not load your records.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetch();
    return () => { active = false; };
    // The retry counter deliberately restarts the focused request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, load]));

  return { data, loading, error, retry: () => setAttempt(value => value + 1) };
}
