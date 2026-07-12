import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FileEntry } from '@app-types/file';
import { FileIcon } from '@components/file/FileIcon';
import { useAppTheme } from '@theme/ThemeProvider';
import { formatBytes, formatDateShort } from '@utils/format';

interface Props {
  entry: FileEntry;
  selected: boolean;
  selectionMode: boolean;
  onPress: (entry: FileEntry) => void;
  onLongPress: (entry: FileEntry) => void;
  onMorePress?: (entry: FileEntry) => void;
}

function FileListItemBase({ entry, selected, selectionMode, onPress, onLongPress, onMorePress }: Props) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: selected ? withAlpha(theme.colors.primary, 0.12) : 'transparent' },
      ]}
    >
      <Pressable
        onPress={() => onPress(entry)}
        onLongPress={() => onLongPress(entry)}
        android_ripple={{ color: theme.colors.surfaceVariant }}
        style={styles.pressableArea}
      >
        <View style={styles.leading}>
          {selectionMode ? (
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: selected ? theme.colors.primary : theme.colors.outline,
                  backgroundColor: selected ? theme.colors.primary : 'transparent',
                },
              ]}
            >
              {selected && <MaterialCommunityIcons name="check" size={16} color={theme.colors.onPrimary} />}
            </View>
          ) : (
            <FileIcon entry={entry} size={42} />
          )}
        </View>

        <View style={styles.textBlock}>
          <Text variant="bodyLarge" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
            {entry.name}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
            {entry.isDirectory ? formatDateShort(entry.modifiedAt) : `${formatBytes(entry.size)} · ${formatDateShort(entry.modifiedAt)}`}
          </Text>
        </View>
      </Pressable>

      {!selectionMode && onMorePress && (
        <Pressable
          hitSlop={12}
          onPress={() => onMorePress(entry)}
          style={styles.moreButton}
        >
          <MaterialCommunityIcons name="dots-vertical" size={20} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      )}
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
  },
  pressableArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leading: {
    width: 42,
    height: 42,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  moreButton: {
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 16,
  },
});

export const FileListItem = memo(FileListItemBase);
