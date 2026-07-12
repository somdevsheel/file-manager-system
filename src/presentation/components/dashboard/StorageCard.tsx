import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { StorageVolume } from '@app-types/file';
import { useAppTheme } from '@theme/ThemeProvider';
import { formatBytes } from '@utils/format';

interface Props {
  volume: StorageVolume;
  onPress: () => void;
}

export function StorageCard({ volume, onPress }: Props) {
  const theme = useAppTheme();
  const used = Math.max(0, volume.totalBytes - volume.freeBytes);
  const ratio = volume.totalBytes > 0 ? used / volume.totalBytes : 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.custom.radius.lg },
      ]}
    >
      <View style={styles.headerRow}>
        <MaterialCommunityIcons
          name={volume.isPrimary ? 'cellphone' : 'sd'}
          size={22}
          color={theme.colors.onPrimaryContainer}
        />
        <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, marginLeft: 8 }}>
          {volume.label}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(100, Math.round(ratio * 100))}%`,
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </View>

      <View style={styles.footerRow}>
        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
          {formatBytes(used)} used of {formatBytes(volume.totalBytes)}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
          {formatBytes(volume.freeBytes)} free
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
