import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@theme/ThemeProvider';

interface Props {
  onRequestAccess: () => void;
}

export function PermissionGateScreen({ onRequestAccess }: Props) {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.custom.radius.full },
        ]}
      >
        <MaterialCommunityIcons name="folder-key-outline" size={48} color={theme.colors.onPrimaryContainer} />
      </View>
      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
        Storage access needed
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Files By Arutech needs access to all files on your device to browse, organize, and manage folders. Grant
        "All files access" in the next screen to continue.
      </Text>
      <Button mode="contained" onPress={onRequestAccess} style={styles.button} contentStyle={styles.buttonContent}>
        Grant access
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { textAlign: 'center', fontWeight: '700' },
  subtitle: { textAlign: 'center', marginTop: 12, lineHeight: 20 },
  button: { marginTop: 28, alignSelf: 'stretch' },
  buttonContent: { paddingVertical: 6 },
});
