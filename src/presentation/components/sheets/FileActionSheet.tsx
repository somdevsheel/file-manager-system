import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useActionSheetStore } from '@store/actionSheetStore';
import { useInputDialogStore } from '@store/inputDialogStore';
import { useConfirmDialogStore } from '@store/confirmDialogStore';
import { useFileBrowserStore } from '@store/fileBrowserStore';
import { useStorageStore } from '@store/storageStore';
import { FileService } from '@services/FileService';
import { FileOperationsService } from '@services/FileOperationsService';
import { ShareService } from '@services/ShareService';
import { ApkService } from '@services/ApkService';
import { FavoritesService } from '@services/FavoritesService';
import { FileIcon } from '@components/file/FileIcon';
import { useAppTheme } from '@theme/ThemeProvider';
import { formatBytes, formatDate } from '@utils/format';
import { navigate } from '@navigation/navigationRef';
import { openFilePreview } from '@utils/openFilePreview';
import { FileCategory } from '@app-types/file';

interface ActionItem {
  key: string;
  label: string;
  icon: string;
  destructive?: boolean;
  onPress: () => void;
}

// Built on React Native's core Modal rather than @gorhom/bottom-sheet — the latter's
// present()/animation relies on react-native-reanimated internals that don't yet work
// under reanimated v4 (required here since RN 0.86 forces New Architecture), silently
// no-op'ing with no error. See github.com/gorhom/react-native-bottom-sheet/issues/2547.
export function FileActionSheet() {
  const theme = useAppTheme();
  const target = useActionSheetStore((s) => s.target);
  const close = useActionSheetStore((s) => s.close);
  const [isFavorite, setIsFavorite] = useState(false);
  const primaryVolume = useStorageStore((s) => s.primaryVolume);

  useEffect(() => {
    if (target) {
      FavoritesService.isFavorite(target.path).then(setIsFavorite);
    }
  }, [target]);

  const actions: ActionItem[] = useMemo(() => {
    if (!target) return [];
    const list: ActionItem[] = [];

    list.push({
      key: 'open',
      label: target.isDirectory ? 'Open' : 'Open with',
      icon: target.isDirectory ? 'folder-open-outline' : 'open-in-app',
      onPress: () => {
        close();
        if (target.isDirectory) {
          navigate('Browser', { path: target.path, title: target.name });
        } else {
          openFilePreview(target.path, target.category);
        }
      },
    });

    if (!target.isDirectory) {
      list.push({
        key: 'share',
        label: 'Share',
        icon: 'share-variant-outline',
        onPress: () => {
          close();
          ShareService.shareFiles([target.path]);
        },
      });
    }

    list.push({
      key: 'favorite',
      label: isFavorite ? 'Remove from favorites' : 'Add to favorites',
      icon: isFavorite ? 'star' : 'star-outline',
      onPress: async () => {
        await FavoritesService.toggle(target.path, target.name, target.isDirectory);
        close();
      },
    });

    list.push({
      key: 'rename',
      label: 'Rename',
      icon: 'form-textbox',
      onPress: () => {
        close();
        useInputDialogStore.getState().open({
          title: 'Rename',
          initialValue: target.name,
          confirmLabel: 'Rename',
          selectBaseName: !target.isDirectory,
          validate: (v) => (v.trim().length === 0 ? 'Name cannot be empty' : null),
          onConfirm: async (newName) => {
            const parent = FileService.parentPath(target.path);
            await FileService.rename(target.path, FileService.joinPath(parent, newName));
            useFileBrowserStore.getState().triggerRefresh();
          },
        });
      },
    });

    list.push({
      key: 'copy',
      label: 'Copy',
      icon: 'content-copy',
      onPress: () => {
        useFileBrowserStore.getState().setClipboard({ paths: [target.path], mode: 'copy' });
        close();
      },
    });

    list.push({
      key: 'cut',
      label: 'Move',
      icon: 'content-cut',
      onPress: () => {
        useFileBrowserStore.getState().setClipboard({ paths: [target.path], mode: 'cut' });
        close();
      },
    });

    list.push({
      key: 'duplicate',
      label: 'Duplicate',
      icon: 'content-duplicate',
      onPress: async () => {
        close();
        await FileOperationsService.duplicate(target.path);
        useFileBrowserStore.getState().triggerRefresh();
      },
    });

    if (target.category === FileCategory.Zip || target.category === FileCategory.Rar || target.category === FileCategory.SevenZip) {
      list.push({
        key: 'extract',
        label: 'Extract here',
        icon: 'archive-arrow-out-outline',
        onPress: () => {
          close();
          navigate('ZipManager', { archivePath: target.path });
        },
      });
    }

    if (target.category === FileCategory.Apk) {
      list.push({
        key: 'install',
        label: 'Install',
        icon: 'android',
        onPress: () => {
          close();
          ApkService.install(target.path);
        },
      });
      list.push({
        key: 'apkDetails',
        label: 'App info',
        icon: 'information-outline',
        onPress: () => {
          close();
          navigate('ApkDetails', { path: target.path });
        },
      });
    }

    list.push({
      key: 'details',
      label: 'Details',
      icon: 'information-outline',
      onPress: () => {
        close();
        navigate('FileDetails', { path: target.path });
      },
    });

    if (target.isDirectory) {
      list.push({
        key: 'stats',
        label: 'Folder statistics',
        icon: 'chart-donut',
        onPress: () => {
          close();
          navigate('FolderStatistics', { path: target.path });
        },
      });
    }

    list.push({
      key: 'delete',
      label: 'Delete',
      icon: 'trash-can-outline',
      destructive: true,
      onPress: () => {
        close();
        useConfirmDialogStore.getState().open({
          title: 'Move to Recycle Bin',
          message: `"${target.name}" will be moved to the Recycle Bin.`,
          confirmLabel: 'Delete',
          destructive: true,
          onConfirm: async () => {
            const root = primaryVolume?.path ?? FileService.parentPath(target.path);
            await FileOperationsService.moveToTrash([target], root);
            useFileBrowserStore.getState().triggerRefresh();
          },
        });
      },
    });

    return list;
  }, [target, isFavorite, primaryVolume, close]);

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { backgroundColor: theme.colors.elevation.level3 }]}>
        <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
        <ScrollView contentContainerStyle={styles.container} bounces={false}>
          {target && (
            <View style={styles.header}>
              <FileIcon entry={target} size={40} />
              <View style={styles.headerText}>
                <Text variant="titleMedium" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
                  {target.name}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {target.isDirectory ? formatDate(target.modifiedAt) : `${formatBytes(target.size)} · ${formatDate(target.modifiedAt)}`}
                </Text>
              </View>
            </View>
          )}
          {actions.map((action) => (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              android_ripple={{ color: theme.colors.surfaceVariant }}
              style={styles.actionRow}
            >
              <MaterialCommunityIcons
                name={action.icon}
                size={22}
                color={action.destructive ? theme.colors.error : theme.colors.onSurfaceVariant}
                style={styles.actionIcon}
              />
              <Text
                variant="bodyLarge"
                style={{ color: action.destructive ? theme.colors.error : theme.colors.onSurface }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  container: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  headerText: {
    marginLeft: 14,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  actionIcon: {
    marginRight: 24,
    width: 22,
  },
});
