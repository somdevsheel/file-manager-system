import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useStorageStore } from '@store/storageStore';
import { StorageCard } from '@components/dashboard/StorageCard';
import { QuickAccessTile } from '@components/dashboard/QuickAccessTile';
import { FileListItem } from '@components/file/FileListItem';
import { EmptyState } from '@components/common/EmptyState';
import { FileCategory, FileEntry, RecentFileEntry } from '@app-types/file';
import { RecentFilesService } from '@services/RecentFilesService';
import { FileService } from '@services/FileService';
import { openFilePreview } from '@utils/openFilePreview';
import { useAppTheme } from '@theme/ThemeProvider';
import { categoryForExtension } from '@utils/fileCategory';

const QUICK_ACCESS: { category: FileCategory; icon: string; label: string }[] = [
  { category: FileCategory.Image, icon: 'image-outline', label: 'Images' },
  { category: FileCategory.Video, icon: 'movie-outline', label: 'Videos' },
  { category: FileCategory.Audio, icon: 'music-note-outline', label: 'Music' },
  { category: FileCategory.Pdf, icon: 'file-pdf-box', label: 'PDF' },
  { category: FileCategory.Apk, icon: 'android', label: 'Apps' },
  { category: FileCategory.Zip, icon: 'folder-zip-outline', label: 'Archives' },
  { category: FileCategory.Document, icon: 'file-document-outline', label: 'Documents' },
  { category: FileCategory.Code, icon: 'file-code-outline', label: 'Code' },
];

const TOOLS: { icon: string; label: string; color: string; onPress: (nav: NativeStackNavigationProp<RootStackParamList>, rootPath: string) => void }[] = [
  { icon: 'star-outline', label: 'Favorites', color: '#F4B740', onPress: (nav) => nav.navigate('Favorites') },
  { icon: 'history', label: 'Recent', color: '#4C8DFF', onPress: (nav) => nav.navigate('Recent') },
  { icon: 'trash-can-outline', label: 'Recycle Bin', color: '#E5484D', onPress: (nav) => nav.navigate('RecycleBin') },
  { icon: 'chart-donut', label: 'Storage', color: '#22B07D', onPress: (nav, rootPath) => nav.navigate('StorageAnalyzer', { rootPath }) },
  { icon: 'content-duplicate', label: 'Duplicates', color: '#A855F7', onPress: (nav, rootPath) => nav.navigate('DuplicateFinder', { rootPath }) },
  { icon: 'file-alert-outline', label: 'Large Files', color: '#FF6B4A', onPress: (nav, rootPath) => nav.navigate('LargeFileFinder', { rootPath }) },
];

async function toFileEntry(entry: RecentFileEntry): Promise<FileEntry> {
  const info = await FileService.getFileInfo(entry.path).catch(() => null);
  if (info) {
    return info;
  }
  const extension = entry.name.includes('.') ? entry.name.split('.').pop()!.toLowerCase() : '';
  return {
    path: entry.path,
    name: entry.name,
    extension,
    isDirectory: false,
    size: 0,
    modifiedAt: entry.openedAt,
    createdAt: entry.openedAt,
    isHidden: false,
    canWrite: false,
    category: categoryForExtension(extension, false),
  };
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const volumes = useStorageStore((s) => s.volumes);
  const loadVolumes = useStorageStore((s) => s.load);
  const primaryVolume = useStorageStore((s) => s.primaryVolume);

  const [recent, setRecent] = useState<FileEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecent = async () => {
    const entries = await RecentFilesService.getAll(5);
    const enriched = await Promise.all(entries.map((entry) => toFileEntry(entry)));
    setRecent(enriched);
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadVolumes(), loadRecent()]);
    setRefreshing(false);
  };

  const rootPath = primaryVolume?.path ?? '/storage/emulated/0';

  const handleOpenRecent = async (entry: FileEntry) => {
    openFilePreview(entry.path, entry.category);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated={false}>
        <Appbar.Content title="Files By Arutech" titleStyle={{ fontWeight: '700' }} />
        <Appbar.Action icon="magnify" onPress={() => navigation.navigate('Search', { rootPath })} />
        <Appbar.Action icon="cog-outline" onPress={() => navigation.navigate('Settings')} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
      >
        {volumes.map((volume) => (
          <StorageCard
            key={volume.id}
            volume={volume}
            onPress={() => navigation.navigate('Browser', { path: volume.path, title: 'All files' })}
          />
        ))}

        <SectionHeader title="Quick Access" />
        <View style={styles.grid}>
          {QUICK_ACCESS.map((item) => (
            <QuickAccessTile
              key={item.category}
              icon={item.icon}
              label={item.label}
              color={theme.custom.categoryAccentColors[item.category] ?? theme.colors.primary}
              onPress={() => navigation.navigate('Category', { category: item.category, rootPath })}
            />
          ))}
        </View>

        <SectionHeader title="Tools" />
        <View style={styles.grid}>
          {TOOLS.map((tool) => (
            <QuickAccessTile
              key={tool.label}
              icon={tool.icon}
              label={tool.label}
              color={tool.color}
              onPress={() => tool.onPress(navigation, rootPath)}
            />
          ))}
        </View>

        <SectionHeader title="Recent Files" actionLabel="See all" onAction={() => navigation.navigate('Recent')} />
        {recent.length === 0 ? (
          <EmptyState icon="clock-outline" title="No recent files" subtitle="Files you open will show up here." />
        ) : (
          <View style={styles.recentList}>
            {recent.map((entry) => (
              <FileListItem
                key={entry.path}
                entry={entry}
                selected={false}
                selectionMode={false}
                onPress={() => handleOpenRecent(entry)}
                onLongPress={() => {}}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
        {title}
      </Text>
      {actionLabel && (
        <Text variant="labelLarge" style={{ color: theme.colors.primary }} onPress={onAction}>
          {actionLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  recentList: {
    paddingHorizontal: 8,
  },
});
