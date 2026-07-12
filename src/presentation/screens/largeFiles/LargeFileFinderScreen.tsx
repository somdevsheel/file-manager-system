import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Chip, ActivityIndicator } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { LargeFileService, LARGE_FILE_THRESHOLDS } from '@services/LargeFileService';
import { RecentFilesService } from '@services/RecentFilesService';
import { FileListItem } from '@components/file/FileListItem';
import { EmptyState } from '@components/common/EmptyState';
import { useActionSheetStore } from '@store/actionSheetStore';
import { useFileBrowserStore } from '@store/fileBrowserStore';
import { FileEntry } from '@app-types/file';
import { formatBytes } from '@utils/format';
import { openFilePreview } from '@utils/openFilePreview';
import { useAppTheme } from '@theme/ThemeProvider';

export function LargeFileFinderScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'LargeFileFinder'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { rootPath } = route.params;
  const refreshToken = useFileBrowserStore((s) => s.refreshToken);

  const [thresholdIndex, setThresholdIndex] = useState(0);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    LargeFileService.find(rootPath, LARGE_FILE_THRESHOLDS[thresholdIndex].bytes)
      .then((found) => {
        if (!cancelled) setEntries(found);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rootPath, thresholdIndex, refreshToken]);

  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

  const handlePress = (entry: FileEntry) => {
    RecentFilesService.record(entry.path, entry.name);
    openFilePreview(entry.path, entry.category);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Large Files" subtitle={loading ? undefined : `${entries.length} files · ${formatBytes(totalSize)}`} />
      </Appbar.Header>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {LARGE_FILE_THRESHOLDS.map((threshold, index) => (
          <Chip
            key={threshold.label}
            selected={thresholdIndex === index}
            onPress={() => setThresholdIndex(index)}
            style={styles.chip}
            compact
          >
            {threshold.label}
          </Chip>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : entries.length === 0 ? (
        <EmptyState icon="file-alert-outline" title="No large files found" subtitle="Try a smaller size threshold." />
      ) : (
        <FlashList
          data={entries}
          renderItem={({ item }) => (
            <FileListItem
              entry={item}
              selected={false}
              selectionMode={false}
              onPress={handlePress}
              onLongPress={() => {}}
              onMorePress={(entry) => useActionSheetStore.getState().open(entry)}
            />
          )}
          keyExtractor={(item) => item.path}
          estimatedItemSize={64}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chipRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { marginRight: 8 },
});
