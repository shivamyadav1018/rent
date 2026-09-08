import { useEffect, useState } from 'react';

import { initializeDatabase } from '../database/db';
import { useAuthStore } from '../store/authStore';

export function useAppStartup() {
  const initializeAuth = useAuthStore(state => state.initialize);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ ready: false, error: '' });

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    setState({ ready: false, error: '' });

    const start = async () => {
      try {
        await initializeDatabase();
        if (!active) return;
        unsubscribe = initializeAuth();
        setState({ ready: true, error: '' });
      } catch (error) {
        if (active) setState({
          ready: false,
          error: error instanceof Error ? error.message : 'Could not open your local records.',
        });
      }
    };
    start();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [attempt, initializeAuth]);

  return { ...state, retry: () => setAttempt(value => value + 1) };
}
