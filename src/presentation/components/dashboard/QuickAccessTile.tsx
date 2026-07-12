import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@theme/ThemeProvider';

interface Props {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

export function QuickAccessTile({ icon, label, color, onPress }: Props) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View style={[styles.iconWrap, { backgroundColor: withAlpha(color, 0.14), borderRadius: theme.custom.radius.md }]}>
        <MaterialCommunityIcons name={icon} size={26} color={color} />
      </View>
      <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurface, marginTop: 6 }}>
        {label}
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
  tile: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
