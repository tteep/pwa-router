import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/AppColors';

interface SkeletonLineProps {
  width: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
}

export function SkeletonLine({ width, height = 14, style }: SkeletonLineProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: COLORS.surfaceElevated,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SkeletonLine width={40} height={40} style={{ borderRadius: 8 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonLine width="70%" height={14} />
          <SkeletonLine width="45%" height={11} />
        </View>
        <SkeletonLine width={50} height={20} style={{ borderRadius: 6 }} />
      </View>
      <SkeletonLine width="90%" height={11} />
    </View>
  );
}

export function SkeletonStatCard() {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
      }}
    >
      <SkeletonLine width={32} height={32} style={{ borderRadius: 8 }} />
      <SkeletonLine width="60%" height={24} />
      <SkeletonLine width="80%" height={11} />
    </View>
  );
}
