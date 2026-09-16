import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAppOpenAd } from 'react-native-google-mobile-ads';

import { adConfig } from '../config/ads';
import { adMobService } from '../services/adMobService';

const APP_OPEN_COOLDOWN_MS = 15 * 60 * 1000;

export function AppOpenAdGate() {
  const [ready, setReady] = useState(false);
  const currentAppState = (AppState.currentState ?? 'active') as AppStateStatus;
  const appState = useRef<AppStateStatus>(currentAppState);
  const lastShownAt = useRef(0);
  const appOpen = useAppOpenAd(ready ? adConfig.appOpenUnitId : null);
  const { error, isClosed, isLoaded, isShowing, load, show } = appOpen;

  useEffect(() => {
    let active = true;
    adMobService.initialize()
      .then(canRequestAds => {
        if (active) setReady(canRequestAds);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (ready && !isLoaded) {
      load();
    }
  }, [isLoaded, load, ready]);

  useEffect(() => {
    if (isClosed || error) {
      load();
    }
  }, [error, isClosed, load]);

  useEffect(() => {
    const maybeShow = () => {
      const now = Date.now();
      if (!isLoaded || isShowing || now - lastShownAt.current < APP_OPEN_COOLDOWN_MS) {
        return;
      }
      lastShownAt.current = now;
      show();
    };

    const subscription = AppState.addEventListener('change', nextState => {
      const wasInactive = appState.current.match(/inactive|background/);
      appState.current = nextState;
      if (wasInactive && nextState === 'active') {
        maybeShow();
      }
    });

    if (AppState.currentState === 'active') {
      const timer = setTimeout(maybeShow, 1200);
      return () => {
        clearTimeout(timer);
        subscription.remove();
      };
    }

    return () => subscription.remove();
  }, [isLoaded, isShowing, show]);

  return null;
}
