import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { CategoryService } from '@services/CategoryService';
import { RecentFilesService } from '@services/RecentFilesService';
import { FileListItem } from '@components/file/FileListItem';
import { FileGridItem } from '@components/file/FileGridItem';
import { SelectionBar } from '@components/file/SelectionBar';
import { EmptyState } from '@components/common/EmptyState';
import { useActionSheetStore } from '@store/actionSheetStore';
import { useFileBrowserStore } from '@store/fileBrowserStore';
import { useConfirmDialogStore } from '@store/confirmDialogStore';
import { useStorageStore } from '@store/storageStore';
import { categoryCacheKey, getCachedCategoryEntries, setCachedCategoryEntries } from '@store/categoryCacheStore';
import { FileEntry } from '@app-types/file';
import { FileService } from '@services/FileService';
import { FileOperationsService } from '@services/FileOperationsService';
import { ShareService } from '@services/ShareService';
import { CATEGORY_LABELS } from '@utils/fileCategory';
import { openFilePreview } from '@utils/openFilePreview';
import { useAppTheme } from '@theme/ThemeProvider';

export function CategoryListScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Category'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { category, rootPath } = route.params;
  const theme = useAppTheme();
  const { width } = useWindowDimensions();

  const cacheKey = categoryCacheKey(category, rootPath);

  // Lazy initializers run exactly once, synchronously, on first render — the cached list (if any)
  // is on screen before the first paint, with no async gap.
  const [entries, setEntries] = useState<FileEntry[]>(() => getCachedCategoryEntries(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => !getCachedCategoryEntries(cacheKey));
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const refreshToken = useFileBrowserStore((s) => s.refreshToken);

  const selectionMode = useFileBrowserStore((s) => s.selectionMode);
  const selectedPaths = useFileBrowserStore((s) => s.selectedPaths);
  const enterSelectionMode = useFileBrowserStore((s) => s.enterSelectionMode);
  const exitSelectionMode = useFileBrowserStore((s) => s.exitSelectionMode);
  const toggleSelected = useFileBrowserStore((s) => s.toggleSelected);
  const selectAll = useFileBrowserStore((s) => s.selectAll);
  const setClipboard = useFileBrowserStore((s) => s.setClipboard);
  const triggerRefresh = useFileBrowserStore((s) => s.triggerRefresh);
  const primaryVolume = useStorageStore((s) => s.primaryVolume);

  const numColumns = Math.max(2, Math.floor(width / 130));

  const selectedEntries = useMemo(
    () => entries.filter((e) => selectedPaths.has(e.path)),
    [entries, selectedPaths],
  );

  // showSpinner: only block the UI when there's nothing cached to show yet. Otherwise the
  // already-cached list stays on screen while a fresh scan runs quietly underneath it.
  const load = async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      const results = await CategoryService.scan(rootPath, category);
      const sorted = FileService.sortEntries(results, { field: 'modifiedAt', order: 'desc' });
      setEntries(sorted);
      setCachedCategoryEntries(cacheKey, sorted);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    load(!getCachedCategoryEntries(cacheKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, rootPath, refreshToken]);

  useEffect(() => {
    return () => exitSelectionMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  };

  const handlePress = (entry: FileEntry) => {
    if (selectionMode) {
      toggleSelected(entry.path);
      return;
    }
    RecentFilesService.record(entry.path, entry.name);
    openFilePreview(entry.path, entry.category);
  };

  const handleLongPress = (entry: FileEntry) => {
    if (!selectionMode) enterSelectionMode(entry.path);
    else toggleSelected(entry.path);
  };

  const handleBulkDelete = () => {
    useConfirmDialogStore.getState().open({
      title: 'Move to Recycle Bin',
      message: `${selectedEntries.length} item(s) will be moved to the Recycle Bin.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        const root = primaryVolume?.path ?? rootPath;
        await FileOperationsService.moveToTrash(selectedEntries, root);
        exitSelectionMode();
        triggerRefresh();
      },
    });
  };

  const renderItem = ({ item }: { item: FileEntry }) =>
    viewMode === 'list' ? (
      <FileListItem
        entry={item}
        selected={selectedPaths.has(item.path)}
        selectionMode={selectionMode}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onMorePress={(entry) => useActionSheetStore.getState().open(entry)}
      />
    ) : (
      <FileGridItem
        entry={item}
        selected={selectedPaths.has(item.path)}
        selectionMode={selectionMode}
        columnWidth={width / numColumns - 12}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
    );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        {selectionMode ? (
          <>
            <Appbar.Action icon="close" onPress={exitSelectionMode} />
            <Appbar.Content title={`${selectedPaths.size} selected`} />
            <Appbar.Action icon="select-all" onPress={() => selectAll(entries.map((e) => e.path))} />
          </>
        ) : (
          <>
            <Appbar.BackAction onPress={() => navigation.goBack()} />
            <Appbar.Content title={CATEGORY_LABELS[category]} subtitle={loading ? undefined : `${entries.length} items`} />
            <Appbar.Action
              icon={viewMode === 'list' ? 'view-grid-outline' : 'view-list-outline'}
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            />
          </>
        )}
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Loading…</Text>
        </View>
      ) : entries.length === 0 ? (
        <EmptyState icon="folder-search-outline" title={`No ${CATEGORY_LABELS[category].toLowerCase()} found`} />
      ) : (
        <FlashList
          key={viewMode}
          data={entries}
          extraData={selectedPaths}
          renderItem={renderItem}
          keyExtractor={(item) => item.path}
          numColumns={viewMode === 'grid' ? numColumns : 1}
          estimatedItemSize={viewMode === 'list' ? 64 : 130}
          contentContainerStyle={{ paddingBottom: selectionMode ? 96 : 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
        />
      )}

      {selectionMode && (
        <SelectionBar
          actions={[
            { icon: 'content-copy', label: 'Copy', onPress: () => { setClipboard({ paths: selectedEntries.map((e) => e.path), mode: 'copy' }); exitSelectionMode(); } },
            { icon: 'content-cut', label: 'Move', onPress: () => { setClipboard({ paths: selectedEntries.map((e) => e.path), mode: 'cut' }); exitSelectionMode(); } },
            { icon: 'share-variant-outline', label: 'Share', onPress: () => ShareService.shareFiles(selectedEntries.map((e) => e.path)) },
            { icon: 'trash-can-outline', label: 'Delete', onPress: handleBulkDelete, destructive: true },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
