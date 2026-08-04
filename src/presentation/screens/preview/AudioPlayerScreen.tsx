import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Appbar, Text, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TrackPlayer, {
  Event,
  RepeatMode,
  Track,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { SeekBar } from '@components/media/SeekBar';
import { useAppTheme } from '@theme/ThemeProvider';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function toTrackObject(path: string): Track {
  return { id: path, url: `file://${path}`, title: path.split('/').pop() ?? path, artist: 'Unknown artist' };
}

const REPEAT_ICONS: Record<RepeatMode, string> = {
  [RepeatMode.Off]: 'repeat-off',
  [RepeatMode.Queue]: 'repeat',
  [RepeatMode.Track]: 'repeat-once',
};

interface NowPlayingMeta {
  title: string;
  artist?: string;
  album?: string;
  artwork?: string;
}

export function AudioPlayerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'AudioPlayer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { path, playlist } = route.params;

  const originalTracksRef = useRef(playlist && playlist.length > 0 ? playlist : [path]);
  const tracks = originalTracksRef.current;
  const hasQueue = tracks.length > 1;

  const [ready, setReady] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingMeta>({ title: path.split('/').pop() ?? path });
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(RepeatMode.Off);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [queueVisible, setQueueVisible] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [seekRatio, setSeekRatio] = useState(0);

  const playbackState = usePlaybackState();
  const progress = useProgress();

  const refreshQueue = async () => {
    const [q, idx] = await Promise.all([TrackPlayer.getQueue(), TrackPlayer.getActiveTrackIndex()]);
    setQueue(q);
    setActiveIndex(idx ?? 0);
  };

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
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
      await TrackPlayer.add(tracks.map(toTrackObject));
      const startIndex = Math.max(0, tracks.indexOf(path));
      await TrackPlayer.skip(startIndex);
      await TrackPlayer.play();
      if (!cancelled) refreshQueue();
    })();
    return () => {
      cancelled = true;
      TrackPlayer.reset().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const activeTrackSub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async () => {
      const track = await TrackPlayer.getActiveTrack();
      if (track) {
        setNowPlaying({ title: track.title ?? '', artist: track.artist, album: track.album, artwork: track.artwork });
      }
      setReady(true);
      refreshQueue();
    });

    const metadataSub = TrackPlayer.addEventListener(Event.MetadataCommonReceived, async (event) => {
      const { title, artist, albumTitle, artworkUri } = event.metadata;
      const index = await TrackPlayer.getActiveTrackIndex();
      if (index === undefined) return;
      const patch: Partial<NowPlayingMeta> = {};
      if (title) patch.title = title;
      if (artist) patch.artist = artist;
      if (albumTitle) patch.album = albumTitle;
      if (artworkUri) patch.artwork = artworkUri;
      if (Object.keys(patch).length === 0) return;
      await TrackPlayer.updateMetadataForTrack(index, patch);
      setNowPlaying((prev) => ({ ...prev, ...patch }));
      refreshQueue();
    });

    return () => {
      activeTrackSub.remove();
      metadataSub.remove();
    };
  }, []);

  const isPlaying = playbackState.state === 'playing';

  const togglePlay = () => {
    if (isPlaying) TrackPlayer.pause();
    else TrackPlayer.play();
  };

  const cycleRepeatMode = async () => {
    const next =
      repeatMode === RepeatMode.Off ? RepeatMode.Queue : repeatMode === RepeatMode.Queue ? RepeatMode.Track : RepeatMode.Off;
    await TrackPlayer.setRepeatMode(next);
    setRepeatMode(next);
  };

  const toggleShuffle = async () => {
    const active = await TrackPlayer.getActiveTrack();
    if (!active) return;
    const activePath = active.id as string;
    await TrackPlayer.removeUpcomingTracks();
    const upcoming = shuffleOn
      ? tracks.slice(tracks.indexOf(activePath) + 1)
      : shuffleArray(tracks.filter((p) => p !== activePath));
    await TrackPlayer.add(upcoming.map(toTrackObject));
    setShuffleOn(!shuffleOn);
    refreshQueue();
  };

  const displayRatio = seeking ? seekRatio : progress.duration > 0 ? progress.position / progress.duration : 0;
  const displayPosition = seeking ? seekRatio * progress.duration : progress.position;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated={false}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Now Playing" />
        {hasQueue && <Appbar.Action icon="playlist-music-outline" onPress={() => setQueueVisible(true)} />}
      </Appbar.Header>

      <View style={styles.artworkWrap}>
        <View style={[styles.artwork, { backgroundColor: theme.colors.primaryContainer }]}>
          {nowPlaying.artwork ? (
            <Image source={{ uri: nowPlaying.artwork }} style={styles.artworkImage} />
          ) : (
            <MaterialCommunityIcons name="music-note" size={72} color={theme.colors.onPrimaryContainer} />
          )}
        </View>
      </View>

      <Text variant="titleMedium" numberOfLines={1} style={[styles.title, { color: theme.colors.onSurface }]}>
        {nowPlaying.title}
      </Text>
      {(nowPlaying.artist || nowPlaying.album) && (
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          {[nowPlaying.artist, nowPlaying.album].filter(Boolean).join(' · ')}
        </Text>
      )}

      <View style={styles.progressRow}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatTime(displayPosition)}
        </Text>
        <SeekBar
          ratio={displayRatio}
          activeColor={theme.colors.primary}
          trackColor={theme.colors.surfaceVariant}
          onSeekStart={(r) => {
            setSeeking(true);
            setSeekRatio(r);
          }}
          onSeekMove={(r) => setSeekRatio(r)}
          onSeekEnd={async (r) => {
            setSeekRatio(r);
            await TrackPlayer.seekTo(r * progress.duration);
            setSeeking(false);
          }}
        />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatTime(progress.duration)}
        </Text>
      </View>

      <View style={styles.controls}>
        {hasQueue && (
          <IconButton
            icon={shuffleOn ? 'shuffle' : 'shuffle-disabled'}
            size={22}
            iconColor={shuffleOn ? theme.colors.primary : theme.colors.onSurfaceVariant}
            onPress={toggleShuffle}
          />
        )}
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
        <IconButton
          icon={REPEAT_ICONS[repeatMode]}
          size={22}
          iconColor={repeatMode !== RepeatMode.Off ? theme.colors.primary : theme.colors.onSurfaceVariant}
          onPress={cycleRepeatMode}
        />
      </View>

      <Modal visible={queueVisible} transparent animationType="slide" onRequestClose={() => setQueueVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setQueueVisible(false)} />
        <View style={[styles.queueSheet, { backgroundColor: theme.colors.elevation.level3 }]}>
          <Text variant="titleMedium" style={[styles.queueTitle, { color: theme.colors.onSurface }]}>
            Up next
          </Text>
          <FlatList
            data={queue}
            keyExtractor={(item, index) => `${item.id ?? item.url}-${index}`}
            renderItem={({ item, index }) => (
              <Pressable
                style={styles.queueRow}
                onPress={async () => {
                  await TrackPlayer.skip(index);
                  setQueueVisible(false);
                }}
              >
                <MaterialCommunityIcons
                  name={index === activeIndex ? 'volume-high' : 'music-note-outline'}
                  size={20}
                  color={index === activeIndex ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.queueRowText,
                    { color: index === activeIndex ? theme.colors.primary : theme.colors.onSurface },
                  ]}
                >
                  {item.title}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  artworkWrap: { alignItems: 'center', marginTop: 32, marginBottom: 24 },
  artwork: { width: 220, height: 220, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artworkImage: { width: '100%', height: '100%' },
  title: { textAlign: 'center', paddingHorizontal: 24 },
  subtitle: { textAlign: 'center', paddingHorizontal: 24, marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 24, gap: 8 },
  seekHitArea: { flex: 1, height: 24, justifyContent: 'center' },
  seekTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  seekFill: { height: 4, borderRadius: 2 },
  seekThumb: { position: 'absolute', top: '50%', width: 12, height: 12, borderRadius: 6, marginLeft: -6, marginTop: -6 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  queueSheet: { maxHeight: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 24 },
  queueTitle: { paddingHorizontal: 20, marginBottom: 8 },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  queueRowText: { flex: 1 },
});
