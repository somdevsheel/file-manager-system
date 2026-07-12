import React from 'react';
import { StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FileCategory, FileEntry } from '@app-types/file';
import { CATEGORY_ICONS } from '@utils/fileCategory';
import { useAppTheme } from '@theme/ThemeProvider';

interface Props {
  entry: FileEntry;
  size?: number;
}

const THUMBNAIL_CATEGORIES = new Set<FileCategory>([FileCategory.Image, FileCategory.Video]);

export function FileIcon({ entry, size = 40 }: Props) {
  const theme = useAppTheme();
  const canThumbnail = !entry.isDirectory && THUMBNAIL_CATEGORIES.has(entry.category);
  const accent = theme.custom.categoryAccentColors[entry.category] ?? theme.colors.primary;

  if (canThumbnail) {
    return (
      <View style={[styles.thumbnailWrap, { width: size, height: size, borderRadius: theme.custom.radius.sm }]}>
        <FastImage
          source={{ uri: `file://${entry.path}`, priority: FastImage.priority.normal }}
          style={StyleSheet.absoluteFill}
          resizeMode={FastImage.resizeMode.cover}
        />
        {entry.category === FileCategory.Video && (
          <View style={styles.playBadge}>
            <MaterialCommunityIcons name="play" size={size * 0.32} color="#FFFFFF" />
          </View>
        )}
      </View>
    );
  }

  const iconName = entry.isDirectory ? 'folder' : CATEGORY_ICONS[entry.category];
  return (
    <View
      style={[
        styles.iconWrap,
        {
          width: size,
          height: size,
          borderRadius: theme.custom.radius.sm,
          backgroundColor: withAlpha(accent, 0.14),
        },
      ]}
    >
      <MaterialCommunityIcons name={iconName} size={size * 0.55} color={accent} />
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
  thumbnailWrap: {
    overflow: 'hidden',
    backgroundColor: '#00000010',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});
