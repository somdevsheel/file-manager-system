import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { ActivityIndicator, IconButton } from 'react-native-paper';
import Video from 'react-native-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { MediaControlNative } from '@native/modules';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const OSD_HIDE_DELAY = 700;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function brightnessIcon(value: number): string {
  return value <= 0.33 ? 'brightness-4' : value <= 0.66 ? 'brightness-6' : 'brightness-7';
}

function volumeIcon(value: number): string {
  if (value <= 0) return 'volume-mute';
  return value < 0.5 ? 'volume-medium' : 'volume-high';
}

interface OsdState {
  type: 'brightness' | 'volume';
  value: number;
}

export function VideoPlayerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoPlayer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { path } = route.params;
  const { width: screenWidth } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [osd, setOsd] = useState<OsdState | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const brightness = useSharedValue(0.5);
  const volume = useSharedValue(0.5);
  const gestureSide = useSharedValue<'left' | 'right'>('left');

  useEffect(() => {
    (async () => {
      try {
        const [b, v] = await Promise.all([MediaControlNative.getBrightness(), MediaControlNative.getVolume()]);
        brightness.value = b;
        volume.value = v;
      } catch {
        // Native module not linked yet (needs a rebuild) — keep the 0.5 defaults.
      }
    })();
    return () => {
      MediaControlNative.clearBrightnessOverride?.();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleHideOsd = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setOsd(null), OSD_HIDE_DELAY);
  };

  const applyBrightness = (value: number) => {
    MediaControlNative.setBrightness(value);
    setOsd({ type: 'brightness', value });
    scheduleHideOsd();
  };

  const applyVolume = (value: number) => {
    MediaControlNative.setVolume(value);
    setOsd({ type: 'volume', value });
    scheduleHideOsd();
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetY([-10, 10])
    .failOffsetX([-25, 25])
    .onStart((e) => {
      gestureSide.value = e.x < screenWidth / 2 ? 'left' : 'right';
    })
    .onChange((e) => {
      if (gestureSide.value === 'left') {
        const next = clamp01(brightness.value - e.changeY / 300);
        brightness.value = next;
        runOnJS(applyBrightness)(next);
      } else {
        const next = clamp01(volume.value - e.changeY / 300);
        volume.value = next;
        runOnJS(applyVolume)(next);
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const videoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.gestureLayer}>
          <Animated.View style={[styles.videoWrap, videoAnimatedStyle]}>
            <Video
              source={{ uri: `file://${path}` }}
              style={styles.video}
              resizeMode="contain"
              controls
              paused={false}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      {osd && (
        <View style={styles.osd} pointerEvents="none">
          <MaterialCommunityIcons
            name={osd.type === 'brightness' ? brightnessIcon(osd.value) : volumeIcon(osd.value)}
            size={26}
            color="#FFFFFF"
          />
          <View style={styles.osdTrack}>
            <View style={[styles.osdFill, { width: `${osd.value * 100}%` }]} />
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      )}
      <IconButton
        icon="arrow-left"
        iconColor="#FFFFFF"
        size={24}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  gestureLayer: { flex: 1 },
  videoWrap: { flex: 1 },
  video: { flex: 1 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 8, left: 4, backgroundColor: 'rgba(0,0,0,0.4)' },
  osd: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  osdTrack: { width: 100, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  osdFill: { height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
});
