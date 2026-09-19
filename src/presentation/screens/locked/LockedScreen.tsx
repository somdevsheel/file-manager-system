import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { LockedFilesService } from '@services/LockedFilesService';
import { FileService } from '@services/FileService';
import { useVaultStore } from '@store/vaultStore';
import { useConfirmDialogStore } from '@store/confirmDialogStore';
import { EmptyState } from '@components/common/EmptyState';
import { FileIcon } from '@components/file/FileIcon';
import { FileEntry, FileCategory, LockedFileEntry } from '@app-types/file';
import { categoryForExtension } from '@utils/fileCategory';
import { formatBytes } from '@utils/format';
import { useAppTheme } from '@theme/ThemeProvider';
import { navigate } from '@navigation/navigationRef';
import { openFilePreview } from '@utils/openFilePreview';
import { VaultSetupView } from './VaultSetupView';
import { VaultUnlockView } from './VaultUnlockView';
import { VaultRecoveryView } from './VaultRecoveryView';

type Mode = 'unlock' | 'recovery';

interface VaultItem {
  locked: LockedFileEntry;
  entry: FileEntry;
}

async function toFileEntry(locked: LockedFileEntry): Promise<FileEntry> {
  const info = await FileService.getFileInfo(locked.vaultPath).catch(() => null);
  if (info) return info;
  const extension = locked.name.includes('.') ? locked.name.split('.').pop()!.toLowerCase() : '';
  return {
    path: locked.vaultPath,
    name: locked.name,
    extension,
    isDirectory: locked.isDirectory,
    size: locked.size,
    modifiedAt: locked.lockedAt,
    createdAt: locked.lockedAt,
    isHidden: false,
    canWrite: true,
    category: categoryForExtension(extension, locked.isDirectory),
  };
}

export function LockedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const isConfigured = useVaultStore((s) => s.isConfigured());

  const [unlocked, setUnlocked] = useState(false);
  const [mode, setMode] = useState<Mode>('unlock');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const locked = await LockedFilesService.getAll();
      const entries = await Promise.all(locked.map(toFileEntry));
      setItems(locked.map((l, i) => ({ locked: l, entry: entries[i] })));
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-lock every time this screen leaves focus, so it never stays open in the background.
  // Deliberately has no dependencies: `useFocusEffect` re-runs its cleanup whenever the memoized
  // callback identity changes, not just on real blur — depending on `unlocked` here would fire
  // this cleanup immediately after handleUnlocked() sets it, instantly re-locking the screen.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setUnlocked(false);
        setMode('unlock');
      };
    }, []),
  );

  const handleUnlocked = () => {
    setUnlocked(true);
    setMode('unlock');
    load();
  };

  const handlePress = (item: VaultItem) => {
    const { entry } = item;
    if (entry.isDirectory) {
      navigation.navigate('Browser', { path: entry.path, title: entry.name });
      return;
    }
    // Deliberately skip RecentFilesService.record() here — recording a vault item's path in
    // "Recent" would leak its existence and location outside the vault, defeating the point.
    if (entry.category === FileCategory.Image) {
      const siblingPaths = items.filter((i) => i.entry.category === FileCategory.Image).map((i) => i.entry.path);
      navigate('ImageViewer', { path: entry.path, siblingPaths });
      return;
    }
    openFilePreview(entry.path, entry.category);
  };

  const handleUnlock = async (item: VaultItem) => {
    setItems((prev) => prev.filter((i) => i.locked.id !== item.locked.id));
    await LockedFilesService.unlock(item.locked);
  };

  const handleDeleteForever = (item: VaultItem) => {
    useConfirmDialogStore.getState().open({
      title: 'Delete forever',
      message: `"${item.entry.name}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setItems((prev) => prev.filter((i) => i.locked.id !== item.locked.id));
        await LockedFilesService.deleteForever(item.locked);
      },
    });
  };

  let body: React.ReactNode;
  if (!isConfigured) {
    body = <VaultSetupView onComplete={handleUnlocked} />;
  } else if (!unlocked) {
    body =
      mode === 'recovery' ? (
        <VaultRecoveryView onRecovered={handleUnlocked} onCancel={() => setMode('unlock')} />
      ) : (
        <VaultUnlockView onUnlocked={handleUnlocked} onForgotPin={() => setMode('recovery')} />
      );
  } else if (loading) {
    body = (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Loading…</Text>
      </View>
    );
  } else if (items.length === 0) {
    body = <EmptyState icon="lock-outline" title="Vault is empty" subtitle="Lock a file from its menu to hide it here." />;
  } else {
    body = (
      <FlashList
        data={items}
        renderItem={({ item }) => (
          <VaultRow
            item={item}
            onPress={() => handlePress(item)}
            onUnlock={() => handleUnlock(item)}
            onDelete={() => handleDeleteForever(item)}
          />
        )}
        keyExtractor={(item) => item.locked.id}
        estimatedItemSize={72}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Locked" subtitle={unlocked ? `${items.length} item(s)` : undefined} />
      </Appbar.Header>
      {body}
    </View>
  );
}

function VaultRow({
  item,
  onPress,
  onUnlock,
  onDelete,
}: {
  item: VaultItem;
  onPress: () => void;
  onUnlock: () => void;
  onDelete: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.row} android_ripple={{ color: theme.colors.surfaceVariant }}>
      <FileIcon entry={item.entry} size={42} />
      <View style={styles.textBlock}>
        <Text variant="bodyLarge" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {item.entry.name}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
          {item.entry.isDirectory ? 'Folder' : formatBytes(item.entry.size)}
        </Text>
      </View>
      <Pressable hitSlop={10} onPress={onUnlock} style={styles.actionButton}>
        <MaterialCommunityIcons name="lock-open-variant-outline" size={20} color={theme.colors.primary} />
      </Pressable>
      <Pressable hitSlop={10} onPress={onDelete} style={styles.actionButton}>
        <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.colors.error} />
      </Pressable>
    </Pressable>
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
  textBlock: { flex: 1, justifyContent: 'center', marginLeft: 14 },
  actionButton: { padding: 8, marginLeft: 4 },
});
