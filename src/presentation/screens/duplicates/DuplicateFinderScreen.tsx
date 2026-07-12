import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Text, Button, ActivityIndicator } from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { DuplicateService, DuplicateScanProgress } from '@services/DuplicateService';
import { FileOperationsService } from '@services/FileOperationsService';
import { FileListItem } from '@components/file/FileListItem';
import { EmptyState } from '@components/common/EmptyState';
import { useStorageStore } from '@store/storageStore';
import { useConfirmDialogStore } from '@store/confirmDialogStore';
import { DuplicateGroup, FileEntry } from '@app-types/file';
import { formatBytes } from '@utils/format';
import { useAppTheme } from '@theme/ThemeProvider';

export function DuplicateFinderScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'DuplicateFinder'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { rootPath } = route.params;
  const primaryVolume = useStorageStore((s) => s.primaryVolume);

  const [scanning, setScanning] = useState(true);
  const [progress, setProgress] = useState<DuplicateScanProgress | null>(null);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setScanning(true);
    DuplicateService.findDuplicates(rootPath, (p) => {
      if (!cancelled) setProgress(p);
    })
      .then((found) => {
        if (!cancelled) setGroups(found);
      })
      .finally(() => {
        if (!cancelled) setScanning(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectFromGroup = (group: DuplicateGroup, paths: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const f of group.files) next.delete(f.path);
      for (const p of paths) next.add(p);
      return next;
    });
  };

  const selectedEntries = useMemo(() => {
    const byPath = new Map<string, FileEntry>();
    for (const group of groups) {
      for (const file of group.files) byPath.set(file.path, file);
    }
    return [...selected].map((p) => byPath.get(p)).filter((f): f is FileEntry => !!f);
  }, [groups, selected]);

  const totalReclaimable = selectedEntries.reduce((sum, f) => sum + f.size, 0);
  const wastedSpace = groups.reduce((sum, g) => sum + g.size * (g.files.length - 1), 0);

  const handleDeleteSelected = () => {
    useConfirmDialogStore.getState().open({
      title: 'Move to Recycle Bin',
      message: `${selectedEntries.length} duplicate file(s) will be moved to the Recycle Bin, freeing ${formatBytes(totalReclaimable)}.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setDeleting(true);
        try {
          const root = primaryVolume?.path ?? rootPath;
          await FileOperationsService.moveToTrash(selectedEntries, root);
          const deletedPaths = new Set(selectedEntries.map((f) => f.path));
          setGroups((prev) =>
            prev
              .map((g) => ({ ...g, files: g.files.filter((f) => !deletedPaths.has(f.path)) }))
              .filter((g) => g.files.length > 1),
          );
          setSelected(new Set());
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Duplicate Finder" subtitle={scanning ? undefined : `${groups.length} groups · ${formatBytes(wastedSpace)} wasted`} />
      </Appbar.Header>

      {scanning ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            {progress && progress.total > 0 ? `Scanning… ${progress.scanned}/${progress.total}` : 'Scanning for duplicates…'}
          </Text>
        </View>
      ) : groups.length === 0 ? (
        <EmptyState icon="content-duplicate" title="No duplicates found" subtitle="This folder doesn't contain any duplicate files." />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: selectedEntries.length > 0 ? 90 : 16 }}>
            {groups.map((group) => (
              <View key={group.hash} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                    {group.files.length} copies · {formatBytes(group.size)} each
                  </Text>
                  <View style={styles.groupActions}>
                    <Button compact onPress={() => selectFromGroup(group, DuplicateService.keepNewest(group))}>
                      Keep newest
                    </Button>
                    <Button compact onPress={() => selectFromGroup(group, DuplicateService.keepOldest(group))}>
                      Keep oldest
                    </Button>
                  </View>
                </View>
                {group.files.map((file) => (
                  <FileListItem
                    key={file.path}
                    entry={file}
                    selected={selected.has(file.path)}
                    selectionMode
                    onPress={(entry) => toggle(entry.path)}
                    onLongPress={() => {}}
                  />
                ))}
              </View>
            ))}
          </ScrollView>

          {selectedEntries.length > 0 && (
            <View style={[styles.footer, { backgroundColor: theme.colors.elevation.level3 }]}>
              <Text style={{ color: theme.colors.onSurface, flex: 1 }}>
                {selectedEntries.length} selected · {formatBytes(totalReclaimable)}
              </Text>
              <Button mode="contained" onPress={handleDeleteSelected} loading={deleting} disabled={deleting}>
                Delete
              </Button>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  group: { marginBottom: 12 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  groupActions: { flexDirection: 'row' },
  footer: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 6,
  },
});
