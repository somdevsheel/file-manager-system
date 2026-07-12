import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Text, IconButton, ProgressBar } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TrackPlayer, { Event, State, usePlaybackState, useProgress } from 'react-native-track-player';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAppTheme } from '@theme/ThemeProvider';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'AudioPlayer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { path, playlist } = route.params;

  const [ready, setReady] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(path.split('/').pop() ?? path);
  const playbackState = usePlaybackState();
  const progress = useProgress();

  const tracks = playlist && playlist.length > 0 ? playlist : [path];
  const hasQueue = tracks.length > 1;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await TrackPlayer.setupPlayer();
      } catch {
        // already initialized
      }
      if (cancelled) return;
      await TrackPlayer.reset();
      await TrackPlayer.add(
        tracks.map((p) => ({ id: p, url: `file://${p}`, title: p.split('/').pop() ?? p, artist: 'Unknown artist' })),
      );
      const startIndex = Math.max(0, tracks.indexOf(path));
      await TrackPlayer.skip(startIndex);
      await TrackPlayer.play();
    })();
    return () => {
      cancelled = true;
      TrackPlayer.reset().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async () => {
      const track = await TrackPlayer.getActiveTrack();
      if (track?.title) setCurrentTitle(track.title);
      setReady(true);
    });
    return () => sub.remove();
  }, []);

  const isPlaying = playbackState.state === State.Playing;

  const togglePlay = () => {
    if (isPlaying) TrackPlayer.pause();
    else TrackPlayer.play();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated={false}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Now Playing" />
      </Appbar.Header>

      <View style={styles.artworkWrap}>
        <View style={[styles.artwork, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="music-note" size={72} color={theme.colors.onPrimaryContainer} />
        </View>
      </View>

      <Text variant="titleMedium" numberOfLines={1} style={[styles.title, { color: theme.colors.onSurface }]}>
        {currentTitle}
      </Text>

      <View style={styles.progressRow}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatTime(progress.position)}
        </Text>
        <ProgressBar
          progress={progress.duration > 0 ? progress.position / progress.duration : 0}
          color={theme.colors.primary}
          style={styles.progressBar}
        />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatTime(progress.duration)}
        </Text>
      </View>

      <View style={styles.controls}>
        {hasQueue && (
          <IconButton icon="skip-previous" size={36} onPress={() => TrackPlayer.skipToPrevious().catch(() => {})} />
        )}
        <IconButton
          icon={isPlaying ? 'pause-circle' : 'play-circle'}
          size={64}
          onPress={togglePlay}
          disabled={!ready}
        />
        {hasQueue && (
          <IconButton icon="skip-next" size={36} onPress={() => TrackPlayer.skipToNext().catch(() => {})} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  artworkWrap: { alignItems: 'center', marginTop: 32, marginBottom: 24 },
  artwork: { width: 220, height: 220, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', paddingHorizontal: 24 },
  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 24, gap: 8 },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
});
