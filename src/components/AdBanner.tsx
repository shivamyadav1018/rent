import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';

import { adConfig } from '../config/ads';
import { adMobService } from '../services/adMobService';
import { colors } from '../theme';

export function AdBanner() {
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(1);
  const [width, setWidth] = useState(0);

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

  return (
    <View
      accessible={ready && height > 1}
      accessibilityLabel="Advertisement"
      onLayout={event => setWidth(Math.floor(event.nativeEvent.layout.width))}
      style={[styles.container, { height }]}
    >
      {ready && width > 0 ? (
        <BannerAd
          maxHeight={90}
          size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
          unitId={adConfig.bannerUnitId}
          width={width}
          onAdLoaded={dimensions => setHeight(dimensions.height)}
          onAdFailedToLoad={() => setHeight(1)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.background,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
