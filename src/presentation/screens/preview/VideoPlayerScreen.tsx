import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import Video, { AudioTrack, OnLoadData, OnProgressData, SelectedTrackType, TextTrack, VideoRef } from 'react-native-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { SeekBar } from '@components/media/SeekBar';
import { MediaControlNative } from '@native/modules';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const OSD_HIDE_DELAY = 700;
const CONTROLS_HIDE_DELAY = 3000;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function brightnessIcon(value: number): string {
  return value <= 0.33 ? 'brightness-4' : value <= 0.66 ? 'brightness-6' : 'brightness-7';
}

function volumeIcon(value: number): string {
  if (value <= 0) return 'volume-mute';
  return value < 0.5 ? 'volume-medium' : 'volume-high';
}

// ISO 639-1/639-2 codes ExoPlayer commonly reports. `track.title` is unreliable for naming a
// track — for multi-audio files it's frequently the channel layout ("Surround", "Stereo") rather
// than anything language-related — so prefer `track.language` and translate the code ourselves.
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', eng: 'English',
  hi: 'Hindi', hin: 'Hindi',
  es: 'Spanish', spa: 'Spanish',
  fr: 'French', fra: 'French', fre: 'French',
  de: 'German', deu: 'German', ger: 'German',
  ja: 'Japanese', jpn: 'Japanese',
  ko: 'Korean', kor: 'Korean',
  zh: 'Chinese', zho: 'Chinese', chi: 'Chinese',
  ar: 'Arabic', ara: 'Arabic',
  ru: 'Russian', rus: 'Russian',
  pt: 'Portuguese', por: 'Portuguese',
  it: 'Italian', ita: 'Italian',
  ta: 'Tamil', tam: 'Tamil',
  te: 'Telugu', tel: 'Telugu',
  bn: 'Bengali', ben: 'Bengali',
  mr: 'Marathi', mar: 'Marathi',
  pa: 'Punjabi', pan: 'Punjabi',
  gu: 'Gujarati', guj: 'Gujarati',
  ml: 'Malayalam', mal: 'Malayalam',
  kn: 'Kannada', kan: 'Kannada',
  ur: 'Urdu', urd: 'Urdu',
};

function languageName(code?: string): string | undefined {
  if (!code) return undefined;
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

function trackLabel(track: AudioTrack | TextTrack, index: number): string {
  const lang = languageName(track.language);
  if (lang && track.title && track.title !== lang) return `${lang} · ${track.title}`;
  if (lang) return lang;
  if (track.title) return track.title;
  return `Track ${index + 1}`;
}

interface OsdState {
  type: 'brightness' | 'volume';
  value: number;
}

interface TapIconProps {
  icon: string;
  size: number;
  onPress: () => void;
  hitSlop?: number;
}

/**
 * A tap target built on gesture-handler's own Gesture.Tap(), not react-native-paper's IconButton
 * (a plain RN Pressable). A plain native touchable nested inside a screen with an active
 * gesture-handler GestureDetector doesn't reliably receive touches — confirmed live: taps landed
 * squarely on IconButtons never fired their onPress, even though the buttons were visually on top
 * and gesture-handler's own docs suggest nested native views should be deferred to. A NESTED
 * GestureDetector, on the other hand, does reliably win over its parent's competing gesture (this
 * is exactly how the seek bar already works), so every interactive control in this screen uses
 * gesture-handler consistently instead of mixing in plain RN touchables.
 */
function TapIcon({ icon, size, onPress, hitSlop = 12 }: TapIconProps) {
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd(onPress);
  return (
    <GestureDetector gesture={tap}>
      <View style={{ padding: hitSlop }}>
        <MaterialCommunityIcons name={icon} size={size} color="#FFFFFF" />
      </View>
    </GestureDetector>
  );
}

export function VideoPlayerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoPlayer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { path } = route.params;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const videoRef = useRef<VideoRef>(null);

  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [seekRatio, setSeekRatio] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [osd, setOsd] = useState<OsdState | null>(null);
  const hideOsdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [textTracks, setTextTracks] = useState<TextTrack[]>([]);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | undefined>(undefined);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | undefined>(undefined);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [settingsVisible, setSettingsVisible] = useState(false);

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
      MediaControlNative.unlockOrientation?.();
      MediaControlNative.setImmersiveMode?.(false);
      if (hideOsdTimerRef.current) clearTimeout(hideOsdTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps fullscreen/immersive state in sync with the ACTUAL rendered orientation, regardless of
  // whether it changed via the fullscreen button (lockLandscape) or the user physically rotating
  // the device — otherwise rotating manually leaves the status bar showing and the layout
  // half-adjusted, since isFullscreen would never flip to true.
  useEffect(() => {
    const landscape = screenWidth > screenHeight;
    setIsFullscreen(landscape);
    MediaControlNative.setImmersiveMode(landscape);
  }, [screenWidth, screenHeight]);

  // Auto-hide the control bar 3s after it's shown, but only while actually playing — stay
  // visible while paused. Deliberately doesn't depend on `position`, or the ~4x/sec progress
  // ticks would keep rescheduling this and it would never fire.
  useEffect(() => {
    if (!controlsVisible || paused) return;
    const timer = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY);
    return () => clearTimeout(timer);
  }, [controlsVisible, paused]);

  const scheduleHideOsd = () => {
    if (hideOsdTimerRef.current) clearTimeout(hideOsdTimerRef.current);
    hideOsdTimerRef.current = setTimeout(() => setOsd(null), OSD_HIDE_DELAY);
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

  const togglePlay = () => setPaused((p) => !p);

  // Forces the rotation (so the button works even if the phone is still held the "wrong" way,
  // or the device has rotation-lock on), then releases the lock shortly after — so this is a
  // one-off nudge rather than a permanent lock, and physical rotation keeps auto-entering and
  // auto-exiting fullscreen afterward in either direction (via the orientation-sync effect above,
  // which reacts to actual rendered dimensions regardless of what triggered the rotation).
  const toggleFullscreen = () => {
    if (isFullscreen) MediaControlNative.lockPortrait();
    else MediaControlNative.lockLandscape();
    setTimeout(() => MediaControlNative.unlockOrientation(), 600);
  };

  const handleBack = () => {
    MediaControlNative.unlockOrientation();
    navigation.goBack();
  };

  // .runOnJS(true) forces these callbacks to run as plain JS-thread functions instead of
  // reanimated UI-thread worklets. Without it, gesture-handler auto-detects reanimated and
  // worklet-ifies these callbacks, and calling a regular JS function via runOnJS from a worklet
  // crashes outright ("Tried to synchronously call a Remote Function") with this project's
  // gesture-handler/reanimated/worklets version combination.
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .runOnJS(true)
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
        applyBrightness(next);
      } else {
        const next = clamp01(volume.value - e.changeY / 300);
        volume.value = next;
        applyVolume(next);
      }
    });

  // Tap-to-toggle-controls lives on the outer gestureLayer, same as pinch/pan. This does compete
  // with the TapIcon buttons nested inside it for the same touch region, but gesture-handler
  // reliably lets a nested child GestureDetector (the buttons) win over its parent's gesture for
  // touches landing in the child's own bounds — unlike the earlier attempt at this, which used a
  // plain RN Pressable for the buttons (IconButton) and for this background toggle, and neither
  // reliably received touches at all once an active GestureDetector existed anywhere in the tree.
  const backgroundTapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => setControlsVisible((v) => !v));

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, backgroundTapGesture);

  const videoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleLoad = (e: OnLoadData) => {
    setDuration(e.duration);
    setAudioTracks(e.audioTracks);
    setTextTracks(e.textTracks);
    setLoading(false);
  };

  const handleProgress = (e: OnProgressData) => {
    if (!seeking) setPosition(e.currentTime);
  };

  const displaySeekRatio = seeking ? seekRatio : duration > 0 ? position / duration : 0;
  const displayPosition = seeking ? seekRatio * duration : position;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.gestureLayer}>
          <Animated.View style={[styles.videoWrap, videoAnimatedStyle]}>
            <Video
              ref={videoRef}
              source={{ uri: `file://${path}` }}
              style={styles.video}
              resizeMode={isFullscreen ? 'cover' : 'contain'}
              controls={false}
              paused={paused}
              rate={playbackRate}
              selectedAudioTrack={
                selectedAudioIndex !== undefined ? { type: SelectedTrackType.INDEX, value: selectedAudioIndex } : undefined
              }
              selectedTextTrack={
                selectedTextIndex !== undefined
                  ? { type: SelectedTrackType.INDEX, value: selectedTextIndex }
                  : { type: SelectedTrackType.DISABLED }
              }
              onLoad={handleLoad}
              onProgress={handleProgress}
              onEnd={() => setPaused(true)}
              onError={() => setLoading(false)}
            />
          </Animated.View>

          {/* Rendered inside the same GestureDetector subtree as the video (see TapIcon above). */}
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

          {!loading && controlsVisible && (
            <>
              <View style={styles.topBar} pointerEvents="box-none">
                <TapIcon icon="arrow-left" size={24} onPress={handleBack} />
              </View>

              <View style={styles.centerPlayWrap} pointerEvents="box-none">
                <TapIcon icon={paused ? 'play-circle' : 'pause-circle'} size={64} onPress={togglePlay} />
              </View>

              <View style={styles.bottomBar}>
                <Text variant="labelSmall" style={styles.timeLabel}>
                  {formatTime(displayPosition)}
                </Text>
                <SeekBar
                  ratio={displaySeekRatio}
                  activeColor="#FFFFFF"
                  trackColor="rgba(255,255,255,0.3)"
                  onSeekStart={(r) => {
                    setSeeking(true);
                    setSeekRatio(r);
                  }}
                  onSeekMove={(r) => setSeekRatio(r)}
                  onSeekEnd={(r) => {
                    setSeekRatio(r);
                    videoRef.current?.seek(r * duration);
                    setPosition(r * duration);
                    setSeeking(false);
                  }}
                />
                <Text variant="labelSmall" style={styles.timeLabel}>
                  {formatTime(duration)}
                </Text>
                <TapIcon icon="cog-outline" size={22} onPress={() => setSettingsVisible(true)} />
                <TapIcon
                  icon={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                  size={22}
                  onPress={toggleFullscreen}
                />
              </View>
            </>
          )}
        </View>
      </GestureDetector>

      <Modal visible={settingsVisible} transparent animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSettingsVisible(false)} />
        <View style={styles.settingsSheet}>
          <ScrollView contentContainerStyle={styles.settingsContent}>
            <Text variant="titleMedium" style={styles.settingsTitle}>
              Playback speed
            </Text>
            <View style={styles.chipRow}>
              {SPEED_OPTIONS.map((speed) => (
                <Pressable
                  key={speed}
                  style={[styles.chip, playbackRate === speed && styles.chipActive]}
                  onPress={() => setPlaybackRate(speed)}
                >
                  <Text style={[styles.chipText, playbackRate === speed && styles.chipTextActive]}>{speed}x</Text>
                </Pressable>
              ))}
            </View>

            {audioTracks.length > 1 && (
              <>
                <Text variant="titleMedium" style={styles.settingsTitle}>
                  Audio
                </Text>
                {audioTracks.map((track, index) => (
                  <Pressable
                    key={track.index}
                    style={styles.settingsRow}
                    onPress={() => {
                      setSelectedAudioIndex(index);
                      setSettingsVisible(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={selectedAudioIndex === index || (selectedAudioIndex === undefined && track.selected) ? 'radiobox-marked' : 'radiobox-blank'}
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.settingsRowText}>{trackLabel(track, index)}</Text>
                  </Pressable>
                ))}
              </>
            )}

            <Text variant="titleMedium" style={styles.settingsTitle}>
              Subtitles
            </Text>
            <Pressable
              style={styles.settingsRow}
              onPress={() => {
                setSelectedTextIndex(undefined);
                setSettingsVisible(false);
              }}
            >
              <MaterialCommunityIcons
                name={selectedTextIndex === undefined ? 'radiobox-marked' : 'radiobox-blank'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.settingsRowText}>Off</Text>
            </Pressable>
            {textTracks.map((track, index) => (
              <Pressable
                key={track.index}
                style={styles.settingsRow}
                onPress={() => {
                  setSelectedTextIndex(index);
                  setSettingsVisible(false);
                }}
              >
                <MaterialCommunityIcons
                  name={selectedTextIndex === index ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.settingsRowText}>{trackLabel(track, index)}</Text>
              </Pressable>
            ))}
            {textTracks.length === 0 && <Text style={styles.settingsEmptyText}>No subtitle tracks in this file</Text>}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  gestureLayer: { flex: 1 },
  videoWrap: { flex: 1 },
  video: { flex: 1 },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  centerPlayWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  timeLabel: { color: '#FFFFFF', minWidth: 36, textAlign: 'center' },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  settingsSheet: {
    maxHeight: '70%',
    backgroundColor: '#1C1C1C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  settingsContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  settingsTitle: { color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  settingsRowText: { color: '#FFFFFF', flex: 1 },
  settingsEmptyText: { color: 'rgba(255,255,255,0.5)', paddingVertical: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  chipActive: { backgroundColor: '#FFFFFF' },
  chipText: { color: '#FFFFFF' },
  chipTextActive: { color: '#000000', fontWeight: '700' },
});
