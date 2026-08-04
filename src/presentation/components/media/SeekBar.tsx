import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export interface SeekBarProps {
  ratio: number;
  activeColor: string;
  trackColor: string;
  onSeekStart: (ratio: number) => void;
  onSeekMove: (ratio: number) => void;
  onSeekEnd: (ratio: number) => void;
}

/**
 * Draggable/tappable progress bar built on react-native-gesture-handler rather than core
 * PanResponder. A plain PanResponder sibling doesn't reliably receive touches when another
 * GestureDetector is active elsewhere in the same screen — gesture-handler intercepts touch
 * dispatch at the native level across its whole rooted subtree, so it can steal touches from a
 * PanResponder even when the PanResponder view is visually on top (this broke seeking in
 * VideoPlayerScreen, which also has a full-screen pinch/pan/tap GestureDetector). Using
 * gesture-handler consistently here lets it arbitrate correctly instead. minDistance(0) makes a
 * plain tap (no drag) seek immediately, matching typical seek bar behavior. .runOnJS(true) avoids
 * the worklet-vs-reanimated crash covered in VideoPlayerScreen.
 */
export function SeekBar({ ratio, activeColor, trackColor, onSeekStart, onSeekMove, onSeekEnd }: SeekBarProps) {
  const widthRef = useRef(0);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onStart((e) => onSeekStart(widthRef.current > 0 ? clamp01(e.x / widthRef.current) : 0))
    .onChange((e) => onSeekMove(widthRef.current > 0 ? clamp01(e.x / widthRef.current) : 0))
    .onEnd((e) => onSeekEnd(widthRef.current > 0 ? clamp01(e.x / widthRef.current) : 0));

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={styles.seekHitArea}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
        }}
      >
        <View style={[styles.seekTrack, { backgroundColor: trackColor }]}>
          <View style={[styles.seekFill, { width: `${ratio * 100}%`, backgroundColor: activeColor }]} />
        </View>
        <View style={[styles.seekThumb, { left: `${ratio * 100}%`, backgroundColor: activeColor }]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  seekHitArea: { flex: 1, height: 24, justifyContent: 'center' },
  seekTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  seekFill: { height: 4, borderRadius: 2 },
  seekThumb: { position: 'absolute', top: '50%', width: 12, height: 12, borderRadius: 6, marginLeft: -6, marginTop: -6 },
});
