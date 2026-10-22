import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Appbar, FAB, Menu, Text } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useDirectoryListing } from '@hooks/useDirectoryListing';
import { useSelectionModeLifecycle } from '@hooks/useSelectionModeLifecycle';
import { useFileBrowserStore } from '@store/fileBrowserStore';
import { useSettingsStore } from '@store/settingsStore';
import { useActionSheetStore } from '@store/actionSheetStore';
import { useInputDialogStore } from '@store/inputDialogStore';
import { useConfirmDialogStore } from '@store/confirmDialogStore';
import { useStorageStore } from '@store/storageStore';
import { FileListItem } from '@components/file/FileListItem';
import { FileGridItem } from '@components/file/FileGridItem';
import { SelectionBar } from '@components/file/SelectionBar';
import { EmptyState } from '@components/common/EmptyState';
import { FileEntry, SortField } from '@app-types/file';
import { FileService } from '@services/FileService';
import { FileOperationsService } from '@services/FileOperationsService';
import { ShareService } from '@services/ShareService';
import { RecentFilesService } from '@services/RecentFilesService';
import { LockedFilesService } from '@services/LockedFilesService';
import { useVaultStore } from '@store/vaultStore';
import { navigate } from '@navigation/navigationRef';
import { imageSiblings, openFilePreview } from '@utils/openFilePreview';
import { validateFileName } from '@utils/fileName';
import { notify, notifyError } from '@utils/notify';
import { useAppTheme } from '@theme/ThemeProvider';

interface Props {
  path: string;
  title?: string;
  isRoot?: boolean;
}

const THUMBNAIL_COLUMN_BASE: Record<string, number> = { small: 110, medium: 130, large: 160 };
const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'size', label: 'Size' },
  { field: 'modifiedAt', label: 'Date modified' },
  { field: 'extension', label: 'Type' },
];

export function BrowserScreen({ path, title, isRoot }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const theme = useAppTheme();
  const { width } = useWindowDimensions();

  const { entries, loading, error, reload } = useDirectoryListing(path);
  useSelectionModeLifecycle();
  const viewMode = useFileBrowserStore((s) => s.viewMode);
  const setViewMode = useFileBrowserStore((s) => s.setViewMode);
  const sortField = useFileBrowserStore((s) => s.sortField);
  const sortOrder = useFileBrowserStore((s) => s.sortOrder);
  const setSort = useFileBrowserStore((s) => s.setSort);
  const toggleSortOrder = useFileBrowserStore((s) => s.toggleSortOrder);
  const selectionMode = useFileBrowserStore((s) => s.selectionMode);
  const selectedPaths = useFileBrowserStore((s) => s.selectedPaths);
  const enterSelectionMode = useFileBrowserStore((s) => s.enterSelectionMode);
  const exitSelectionMode = useFileBrowserStore((s) => s.exitSelectionMode);
  const toggleSelected = useFileBrowserStore((s) => s.toggleSelected);
  const selectAll = useFileBrowserStore((s) => s.selectAll);
  const clipboard = useFileBrowserStore((s) => s.clipboard);
  const setClipboard = useFileBrowserStore((s) => s.setClipboard);
  const triggerRefresh = useFileBrowserStore((s) => s.triggerRefresh);

  const showHiddenFiles = useSettingsStore((s) => s.showHiddenFiles);
  const setShowHiddenFiles = useSettingsStore((s) => s.setShowHiddenFiles);
  const thumbnailSize = useSettingsStore((s) => s.thumbnailSize);
  const primaryVolume = useStorageStore((s) => s.primaryVolume);

  const [refreshing, setRefreshing] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [overflowMenuVisible, setOverflowMenuVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    if (!isFocused) setFabOpen(false);
  }, [isFocused]);
  const [pasting, setPasting] = useState(false);

  const columnWidth = THUMBNAIL_COLUMN_BASE[thumbnailSize] ?? 130;
  const numColumns = Math.max(2, Math.floor(width / columnWidth));

  const selectedEntries = useMemo(
    () => entries.filter((e) => selectedPaths.has(e.path)),
    [entries, selectedPaths],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handlePressEntry = (entry: FileEntry) => {
    if (selectionMode) {
      toggleSelected(entry.path);
      return;
    }
    if (entry.isDirectory) {
      navigation.push('Browser', { path: entry.path, title: entry.name });
    } else {
      RecentFilesService.record(entry.path, entry.name);
      openFilePreview(entry.path, entry.category, imageSiblings(entries));
    }
  };

  const handleLongPress = (entry: FileEntry) => {
    if (!selectionMode) enterSelectionMode(entry.path);
    else toggleSelected(entry.path);
  };

  const handleMorePress = (entry: FileEntry) => useActionSheetStore.getState().open(entry);

  const handleNewFolder = () => {
    setFabOpen(false);
    useInputDialogStore.getState().open({
      title: 'New folder',
      label: 'Folder name',
      confirmLabel: 'Create',
      validate: validateFileName,
      onConfirm: async (name) => {
        await FileService.createFolder(FileService.joinPath(path, name.trim()));
        triggerRefresh();
      },
    });
  };

  const handleNewFile = () => {
    setFabOpen(false);
    useInputDialogStore.getState().open({
      title: 'New file',
      label: 'File name',
      confirmLabel: 'Create',
      validate: validateFileName,
      onConfirm: async (name) => {
        await FileService.createFile(FileService.joinPath(path, name.trim()));
        triggerRefresh();
      },
    });
  };

  const handlePasteHere = async () => {
    if (!clipboard) return;
    setPasting(true);
    try {
      if (clipboard.mode === 'copy') {
        await FileOperationsService.copy(clipboard.paths, path);
      } else {
        await FileOperationsService.move(clipboard.paths, path);
        setClipboard(null);
      }
      triggerRefresh();
    } catch (e) {
      notifyError(e, 'Paste failed');
      triggerRefresh(); // part of a multi-item paste may still have gone through
    } finally {
      setPasting(false);
    }
  };

  const handleBulkDelete = () => {
    useConfirmDialogStore.getState().open({
      title: 'Move to Recycle Bin',
      message: `${selectedEntries.length} item(s) will be moved to the Recycle Bin.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        const root = primaryVolume?.path ?? path;
        await FileOperationsService.moveToTrash(selectedEntries, root);
        exitSelectionMode();
        triggerRefresh();
      },
    });
  };

  const handleBulkLock = () => {
    if (!useVaultStore.getState().isConfigured()) {
      useConfirmDialogStore.getState().open({
        title: 'Set up your vault',
        message: 'You need to set up a PIN for your Locked vault before locking files.',
        confirmLabel: 'Set up',
        onConfirm: () => navigate('Locked'),
      });
      return;
    }
    useConfirmDialogStore.getState().open({
      title: 'Lock files',
      message: `${selectedEntries.length} item(s) will be moved to your Locked vault and hidden from this location.`,
      confirmLabel: 'Lock',
      onConfirm: async () => {
        await LockedFilesService.lock(selectedEntries);
        exitSelectionMode();
        triggerRefresh();
      },
    });
  };

  const noneSelected = selectedEntries.length === 0;
  // Folders can't be attached to a share intent; only offer Share when the selection is all files.
  const canShare = !noneSelected && selectedEntries.every((e) => !e.isDirectory);

  const handleClip = (mode: 'copy' | 'cut') => {
    setClipboard({ paths: selectedEntries.map((e) => e.path), mode });
    exitSelectionMode();
    notify(`${selectedEntries.length} item(s) ready to ${mode === 'copy' ? 'copy' : 'move'} — open a folder and paste`);
  };

  const handleBulkShare = () => {
    ShareService.shareFiles(selectedEntries.map((e) => e.path)).catch((e) => notifyError(e, "Couldn't share"));
  };

  const renderItem = ({ item }: { item: FileEntry }) =>
    viewMode === 'list' ? (
      <FileListItem
        entry={item}
        selected={selectedPaths.has(item.path)}
        selectionMode={selectionMode}
        onPress={handlePressEntry}
        onLongPress={handleLongPress}
        onMorePress={handleMorePress}
      />
    ) : (
      <FileGridItem
        entry={item}
        selected={selectedPaths.has(item.path)}
        selectionMode={selectionMode}
        columnWidth={width / numColumns - 12}
        onPress={handlePressEntry}
        onLongPress={handleLongPress}
      />
    );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        {!isRoot && <Appbar.BackAction onPress={() => navigation.goBack()} />}
        {selectionMode ? (
          <>
            <Appbar.Action icon="close" onPress={exitSelectionMode} />
            <Appbar.Content title={`${selectedPaths.size} selected`} />
            <Appbar.Action icon="select-all" onPress={() => selectAll(entries.map((e) => e.path))} />
          </>
        ) : (
          <>
            <Appbar.Content title={title ?? 'Files'} />
            <Appbar.Action icon="magnify" onPress={() => navigation.navigate('Search', { rootPath: path })} />
            <Appbar.Action
              icon={viewMode === 'list' ? 'view-grid-outline' : 'view-list-outline'}
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            />
            <Menu
              visible={sortMenuVisible}
              onDismiss={() => setSortMenuVisible(false)}
              anchor={<Appbar.Action icon="sort" onPress={() => setSortMenuVisible(true)} />}
            >
              {SORT_OPTIONS.map((opt) => (
                <Menu.Item
                  key={opt.field}
                  title={opt.label}
                  leadingIcon={sortField === opt.field ? 'check' : undefined}
                  onPress={() => {
                    setSort(opt.field, sortField === opt.field && sortOrder === 'asc' ? 'desc' : 'asc');
                    setSortMenuVisible(false);
                  }}
                />
              ))}
              <Menu.Item
                title={sortOrder === 'asc' ? 'Descending' : 'Ascending'}
                leadingIcon="swap-vertical"
                onPress={() => {
                  toggleSortOrder();
                  setSortMenuVisible(false);
                }}
              />
            </Menu>
            <Menu
              visible={overflowMenuVisible}
              onDismiss={() => setOverflowMenuVisible(false)}
              anchor={<Appbar.Action icon="dots-vertical" onPress={() => setOverflowMenuVisible(true)} />}
            >
              <Menu.Item
                title={showHiddenFiles ? 'Hide hidden files' : 'Show hidden files'}
                leadingIcon={showHiddenFiles ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => {
                  setShowHiddenFiles(!showHiddenFiles);
                  setOverflowMenuVisible(false);
                }}
              />
              <Menu.Item
                title="Folder statistics"
                leadingIcon="chart-donut"
                onPress={() => {
                  setOverflowMenuVisible(false);
                  navigation.navigate('FolderStatistics', { path });
                }}
              />
            </Menu>
          </>
        )}
      </Appbar.Header>

      {loading && entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Loading…</Text>
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title="Can't open this folder" subtitle={error} />
      ) : entries.length === 0 ? (
        <EmptyState icon="folder-open-outline" title="This folder is empty" subtitle="Files you add here will show up in this list." />
      ) : (
        <FlashList
          key={viewMode}
          data={entries}
          extraData={selectedPaths}
          renderItem={renderItem}
          keyExtractor={(item) => item.path}
          numColumns={viewMode === 'grid' ? numColumns : 1}
          estimatedItemSize={viewMode === 'list' ? 64 : columnWidth}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
        />
      )}

      {selectionMode ? (
        <SelectionBar
          actions={[
            { icon: 'content-copy', label: 'Copy', onPress: () => handleClip('copy'), disabled: noneSelected },
            { icon: 'content-cut', label: 'Move', onPress: () => handleClip('cut'), disabled: noneSelected },
            { icon: 'share-variant-outline', label: 'Share', onPress: handleBulkShare, disabled: !canShare },
            { icon: 'lock-outline', label: 'Lock', onPress: handleBulkLock, disabled: noneSelected },
            { icon: 'trash-can-outline', label: 'Delete', onPress: handleBulkDelete, destructive: true, disabled: noneSelected },
          ]}
        />
      ) : clipboard ? (
        <View style={[styles.pasteBar, { backgroundColor: theme.colors.elevation.level3 }]}>
          <Text style={{ color: theme.colors.onSurface, flex: 1 }}>
            {clipboard.paths.length} item(s) ready to {clipboard.mode === 'copy' ? 'copy' : 'move'}
          </Text>
          <Appbar.Action icon="close" size={20} onPress={() => setClipboard(null)} />
          <Appbar.Action icon="content-paste" size={20} onPress={handlePasteHere} disabled={pasting} />
        </View>
      ) : (
        // Rendered inline, not in a <Portal>: portal content lives at the app root, outside this
        // screen, so when the tab is blurred (and react-native-screens freezes it, skipping the
        // re-render that would remove it) the button stayed floating over other tabs like Settings.
        <FAB.Group
          open={fabOpen}
          visible={isFocused}
          icon={fabOpen ? 'close' : 'plus'}
          style={styles.fab}
          actions={[
            { icon: 'folder-plus-outline', label: 'New folder', onPress: handleNewFolder },
            { icon: 'file-plus-outline', label: 'New file', onPress: handleNewFile },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 8, bottom: 8 },
  pasteBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 6,
  },
});
