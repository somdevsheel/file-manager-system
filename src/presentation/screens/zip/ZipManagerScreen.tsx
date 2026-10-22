import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Text, ActivityIndicator, Button } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { ArchiveService, ArchiveEntryInfo } from '@services/ArchiveService';
import { FileService } from '@services/FileService';
import { EmptyState } from '@components/common/EmptyState';
import { useInputDialogStore } from '@store/inputDialogStore';
import { formatBytes } from '@utils/format';
import { notifyError } from '@utils/notify';
import { useFileBrowserStore } from '@store/fileBrowserStore';
import { useAppTheme } from '@theme/ThemeProvider';

export function ZipManagerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ZipManager'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { archivePath } = route.params;
  const archiveName = archivePath.split('/').pop() ?? archivePath;

  const [entries, setEntries] = useState<ArchiveEntryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  const load = useCallback(
    async (pw?: string) => {
      setLoading(true);
      setError(null);
      try {
        const list = await ArchiveService.listEntries(archivePath, pw);
        setEntries(list);
        setNeedsPassword(false);
      } catch (e: any) {
        if (pw !== undefined) {
          setError('Incorrect password');
          setNeedsPassword(true);
        } else if (await ArchiveService.isEncrypted(archivePath).catch(() => false)) {
          setNeedsPassword(true);
        } else {
          // Not a password problem (corrupt / unsupported archive) — say so instead of asking for one.
          setError(e?.message ?? "Couldn't read this archive");
        }
      } finally {
        setLoading(false);
      }
    },
    [archivePath],
  );

  useEffect(() => {
    (async () => {
      // If the check itself fails (corrupt/unsupported file), fall through to listing, which
      // reports the problem — rather than leaving the spinner up forever.
      const encrypted = await ArchiveService.isEncrypted(archivePath).catch(() => false);
      if (encrypted) {
        setNeedsPassword(true);
        setLoading(false);
      } else {
        load();
      }
    })();
  }, [archivePath, load]);

  const promptPassword = () => {
    useInputDialogStore.getState().open({
      title: 'Enter password',
      label: 'Archive password',
      confirmLabel: 'Unlock',
      validate: (v) => (v.trim().length === 0 ? 'Password cannot be empty' : null),
      onConfirm: async (value) => {
        setPassword(value);
        await load(value);
      },
    });
  };

  const handleExtractAll = async () => {
    setExtracting(true);
    try {
      const baseName = archiveName.replace(/\.(zip|7z|rar)$/i, '');
      const parent = FileService.parentPath(archivePath);
      // Extract into a fresh folder rather than silently merging into (and overwriting files in)
      // an existing folder of the same name.
      let folderName = baseName;
      for (let n = 1; await FileService.exists(FileService.joinPath(parent, folderName)); n++) {
        folderName = `${baseName} (${n})`;
      }
      const destDir = FileService.joinPath(parent, folderName);
      const completed = await ArchiveService.extract(archivePath, destDir, password);
      if (completed) {
        useFileBrowserStore.getState().triggerRefresh();
        navigation.navigate('Browser', { path: destDir, title: folderName });
      }
    } catch (e) {
      notifyError(e, "Couldn't extract this archive");
    } finally {
      setExtracting(false);
    }
  };

  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={archiveName} subtitle={loading || needsPassword ? undefined : `${entries.length} items · ${formatBytes(totalSize)}`} />
        {!needsPassword && !loading && entries.length > 0 && (
          <Appbar.Action icon="archive-arrow-out-outline" onPress={handleExtractAll} disabled={extracting} />
        )}
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : needsPassword ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="lock-outline" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 16 }}>
            This archive is password protected
          </Text>
          {error && (
            <Text variant="bodyMedium" style={{ color: theme.colors.error, marginTop: 4 }}>
              {error}
            </Text>
          )}
          <Button mode="contained" onPress={promptPassword} style={{ marginTop: 16 }}>
            Enter password
          </Button>
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title="Can't open this archive" subtitle={error} />
      ) : entries.length === 0 ? (
        <EmptyState icon="folder-zip-outline" title="Empty archive" />
      ) : (
        <FlashList
          data={entries}
          renderItem={({ item }) => <ArchiveRow entry={item} />}
          keyExtractor={(item) => item.name}
          estimatedItemSize={56}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

function ArchiveRow({ entry }: { entry: ArchiveEntryInfo }) {
  const theme = useAppTheme();
  const depth = (entry.name.match(/\//g) ?? []).length;
  const displayName = entry.name.replace(/\/$/, '').split('/').pop() ?? entry.name;

  return (
    <View style={[styles.row, { paddingLeft: 16 + depth * 16 }]}>
      <MaterialCommunityIcons
        name={entry.isDirectory ? 'folder-outline' : 'file-outline'}
        size={20}
        color={theme.colors.onSurfaceVariant}
        style={{ marginRight: 12 }}
      />
      <Text variant="bodyMedium" numberOfLines={1} style={{ color: theme.colors.onSurface, flex: 1 }}>
        {displayName}
      </Text>
      {!entry.isDirectory && (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatBytes(entry.size)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 10,
  },
});
