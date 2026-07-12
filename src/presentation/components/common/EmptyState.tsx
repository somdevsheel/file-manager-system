import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@theme/ThemeProvider';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: Props) {
  const theme = useAppTheme();
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.elevation.level2, borderRadius: theme.custom.radius.full },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={40} color={theme.colors.onSurfaceVariant} />
      </View>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 16 }}>
        {title}
      </Text>
      {subtitle && (
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
