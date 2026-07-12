import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { FavoritesService } from '@services/FavoritesService';
import { RecentFilesService } from '@services/RecentFilesService';
import { FileService } from '@services/FileService';
import { FileListItem } from '@components/file/FileListItem';
import { EmptyState } from '@components/common/EmptyState';
import { useActionSheetStore } from '@store/actionSheetStore';
import { FileEntry } from '@app-types/file';
import { categoryForExtension } from '@utils/fileCategory';
import { openFilePreview } from '@utils/openFilePreview';
import { useAppTheme } from '@theme/ThemeProvider';

export function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const favorites = await FavoritesService.getAll();
      const enriched = await Promise.all(
        favorites.map(async (fav): Promise<FileEntry> => {
          const info = await FileService.getFileInfo(fav.path).catch(() => null);
          const extension = fav.name.includes('.') ? fav.name.split('.').pop()!.toLowerCase() : '';
          return (
            info ?? {
              path: fav.path,
              name: fav.name,
              extension,
              isDirectory: fav.isDirectory,
              size: 0,
              modifiedAt: fav.addedAt,
              createdAt: fav.addedAt,
              isHidden: false,
              canWrite: false,
              category: categoryForExtension(extension, fav.isDirectory),
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
    if (entry.isDirectory) {
      navigation.navigate('Browser', { path: entry.path, title: entry.name });
    } else {
      RecentFilesService.record(entry.path, entry.name);
      openFilePreview(entry.path, entry.category);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Favorites" />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Loading…</Text>
        </View>
      ) : entries.length === 0 ? (
        <EmptyState icon="star-outline" title="No favorites yet" subtitle="Tap the star icon on any file to add it here." />
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
