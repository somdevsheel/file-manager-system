import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { RecentFilesService } from '@services/RecentFilesService';
import { FileService } from '@services/FileService';
import { FileListItem } from '@components/file/FileListItem';
import { EmptyState } from '@components/common/EmptyState';
import { useActionSheetStore } from '@store/actionSheetStore';
import { useConfirmDialogStore } from '@store/confirmDialogStore';
import { FileEntry } from '@app-types/file';
import { categoryForExtension } from '@utils/fileCategory';
import { openFilePreview } from '@utils/openFilePreview';
import { useAppTheme } from '@theme/ThemeProvider';

export function RecentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const recent = await RecentFilesService.getAll(100);
      const enriched = await Promise.all(
        recent.map(async (item): Promise<FileEntry> => {
          const info = await FileService.getFileInfo(item.path).catch(() => null);
          const extension = item.name.includes('.') ? item.name.split('.').pop()!.toLowerCase() : '';
          return (
            info ?? {
              path: item.path,
              name: item.name,
              extension,
              isDirectory: false,
              size: 0,
              modifiedAt: item.openedAt,
              createdAt: item.openedAt,
              isHidden: false,
              canWrite: false,
              category: categoryForExtension(extension, false),
            }
          );
        }),
      );
      setEntries(enriched);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handlePress = (entry: FileEntry) => {
    RecentFilesService.record(entry.path, entry.name);
    openFilePreview(entry.path, entry.category);
  };

  const handleClearAll = () => {
    useConfirmDialogStore.getState().open({
      title: 'Clear recent files',
      message: 'This will remove all items from your recent files list.',
      confirmLabel: 'Clear',
      destructive: true,
      onConfirm: async () => {
        await RecentFilesService.clear();
        setEntries([]);
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Recent" />
        {entries.length > 0 && <Appbar.Action icon="delete-sweep-outline" onPress={handleClearAll} />}
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Loading…</Text>
        </View>
      ) : entries.length === 0 ? (
        <EmptyState icon="history" title="No recent files" subtitle="Files you open will show up here." />
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
});
