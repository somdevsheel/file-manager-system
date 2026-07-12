import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FileEntry } from '@app-types/file';
import { FileIcon } from '@components/file/FileIcon';
import { useAppTheme } from '@theme/ThemeProvider';

interface Props {
  entry: FileEntry;
  selected: boolean;
  selectionMode: boolean;
  columnWidth: number;
  onPress: (entry: FileEntry) => void;
  onLongPress: (entry: FileEntry) => void;
}

function FileGridItemBase({ entry, selected, selectionMode, columnWidth, onPress, onLongPress }: Props) {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={() => onPress(entry)}
      onLongPress={() => onLongPress(entry)}
      android_ripple={{ color: theme.colors.surfaceVariant }}
      style={[
        styles.cell,
        {
          width: columnWidth,
          backgroundColor: selected ? withAlpha(theme.colors.primary, 0.12) : theme.colors.elevation.level1,
          borderRadius: theme.custom.radius.md,
        },
      ]}
    >
      {selectionMode && (
        <View
          style={[
            styles.checkbox,
            {
              borderColor: selected ? theme.colors.primary : '#FFFFFFCC',
              backgroundColor: selected ? theme.colors.primary : 'rgba(0,0,0,0.25)',
            },
          ]}
        >
          {selected && <MaterialCommunityIcons name="check" size={14} color={theme.colors.onPrimary} />}
        </View>
      )}
      <View style={styles.iconArea}>
        <FileIcon entry={entry} size={columnWidth * 0.55} />
      </View>
      <Text
        variant="bodySmall"
        numberOfLines={2}
        style={[styles.label, { color: theme.colors.onSurface }]}
      >
        {entry.name}
      </Text>
    </Pressable>
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
  cell: {
    margin: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  iconArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    textAlign: 'center',
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});

export const FileGridItem = memo(FileGridItemBase);
