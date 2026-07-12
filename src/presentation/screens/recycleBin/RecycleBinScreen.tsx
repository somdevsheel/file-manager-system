import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { RecycleBinService } from '@services/RecycleBinService';
import { useSettingsStore } from '@store/settingsStore';
import { useConfirmDialogStore } from '@store/confirmDialogStore';
import { EmptyState } from '@components/common/EmptyState';
import { RecycleBinEntry } from '@app-types/file';
import { formatBytes, formatDaysRemaining } from '@utils/format';
import { useAppTheme } from '@theme/ThemeProvider';

export function RecycleBinScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const retentionDays = useSettingsStore((s) => s.recycleBinRetentionDays);
  const [entries, setEntries] = useState<RecycleBinEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await RecycleBinService.getAll());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRestore = async (entry: RecycleBinEntry) => {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    await RecycleBinService.restore(entry);
  };

  const handleDeleteForever = (entry: RecycleBinEntry) => {
    useConfirmDialogStore.getState().open({
      title: 'Delete forever',
      message: `"${entry.name}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        await RecycleBinService.deleteForever(entry);
      },
    });
  };

  const handleEmptyBin = () => {
    useConfirmDialogStore.getState().open({
      title: 'Empty Recycle Bin',
      message: `${entries.length} item(s) will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Empty bin',
      destructive: true,
      onConfirm: async () => {
        const toDelete = entries;
        setEntries([]);
        await RecycleBinService.emptyBin(toDelete);
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Recycle Bin" subtitle={`Kept for ${retentionDays} days`} />
        {entries.length > 0 && <Appbar.Action icon="delete-forever-outline" onPress={handleEmptyBin} />}
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Loading…</Text>
        </View>
      ) : entries.length === 0 ? (
        <EmptyState icon="trash-can-outline" title="Recycle Bin is empty" subtitle="Deleted files will appear here before being permanently removed." />
      ) : (
        <FlashList
          data={entries}
          renderItem={({ item }) => (
            <RecycleBinRow
              entry={item}
              retentionDays={retentionDays}
              onRestore={() => handleRestore(item)}
              onDelete={() => handleDeleteForever(item)}
            />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={72}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

function RecycleBinRow({
  entry,
  retentionDays,
  onRestore,
  onDelete,
}: {
  entry: RecycleBinEntry;
  retentionDays: number;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const theme = useAppTheme();
  const daysLeft = formatDaysRemaining(entry.deletedAt, retentionDays);

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors.elevation.level2, borderRadius: theme.custom.radius.sm },
        ]}
      >
        <MaterialCommunityIcons
          name={entry.isDirectory ? 'folder-outline' : 'file-outline'}
          size={22}
          color={theme.colors.onSurfaceVariant}
        />
      </View>
      <View style={styles.textBlock}>
        <Text variant="bodyLarge" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {entry.name}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
          {entry.isDirectory ? '' : `${formatBytes(entry.size)} · `}
          {daysLeft === 0 ? 'Expires today' : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
        </Text>
      </View>
      <Pressable hitSlop={10} onPress={onRestore} style={styles.actionButton}>
        <MaterialCommunityIcons name="restore" size={20} color={theme.colors.primary} />
      </Pressable>
      <Pressable hitSlop={10} onPress={onDelete} style={styles.actionButton}>
        <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.colors.error} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1, justifyContent: 'center' },
  actionButton: { padding: 8, marginLeft: 4 },
});
