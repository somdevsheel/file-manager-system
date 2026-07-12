import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@theme/ThemeProvider';

export interface SelectionBarAction {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export function SelectionBar({ actions }: { actions: SelectionBarAction[] }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.elevation.level3 }]}>
      {actions.map((action) => (
        <View key={action.label} style={styles.action} onTouchEnd={action.onPress}>
          <MaterialCommunityIcons
            name={action.icon}
            size={22}
            color={action.destructive ? theme.colors.error : theme.colors.onSurface}
          />
          <Text
            variant="labelSmall"
            style={{ color: action.destructive ? theme.colors.error : theme.colors.onSurface, marginTop: 2 }}
          >
            {action.label}
          </Text>
        </View>
      ))}
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
