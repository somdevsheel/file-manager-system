import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@theme/ThemeProvider';

export interface SelectionBarAction {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function SelectionBar({ actions }: { actions: SelectionBarAction[] }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.elevation.level3 }]}>
      {actions.map((action) => {
        const color = action.disabled
          ? theme.colors.onSurfaceDisabled
          : action.destructive
            ? theme.colors.error
            : theme.colors.onSurface;
        return (
          // Pressable rather than a View's onTouchEnd: onTouchEnd also fires when a scroll/drag
          // that started elsewhere happens to end over the bar, triggering actions by accident.
          <Pressable
            key={action.label}
            style={styles.action}
            onPress={action.onPress}
            disabled={action.disabled}
            android_ripple={{ color: theme.colors.surfaceVariant, borderless: true }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <MaterialCommunityIcons name={action.icon} size={22} color={color} />
            <Text variant="labelSmall" style={{ color, marginTop: 2 }}>
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingBottom: 18,
    elevation: 8,
  },
  action: {
    flex: 1,
    alignItems: 'center',
  },
});
