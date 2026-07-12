import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Text, Button, ActivityIndicator, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { ApkService } from '@services/ApkService';
import { ApkInfo } from '@app-types/file';
import { useAppTheme } from '@theme/ThemeProvider';

export function ApkDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ApkDetails'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { path } = route.params;

  const [info, setInfo] = useState<ApkInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApkService.getInfo(path)
      .then(setInfo)
      .finally(() => setLoading(false));
  }, [path]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="App info" />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : !info ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Couldn't read this APK.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            {info.iconBase64 ? (
              <Image source={{ uri: `data:image/png;base64,${info.iconBase64}` }} style={styles.icon} />
            ) : (
              <View style={[styles.icon, styles.iconFallback, { backgroundColor: theme.colors.elevation.level2 }]}>
                <MaterialCommunityIcons name="android" size={40} color={theme.colors.onSurfaceVariant} />
              </View>
            )}
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginTop: 12, textAlign: 'center' }}>
              {info.appName}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {info.packageName}
            </Text>

            {info.isInstalled ? (
              <Chip icon="check-circle-outline" style={{ marginTop: 12 }}>
                Installed · v{info.installedVersionName}
              </Chip>
            ) : null}

            <Button mode="contained" style={{ marginTop: 16 }} onPress={() => ApkService.install(path)}>
              {info.isInstalled ? 'Reinstall / Update' : 'Install'}
            </Button>
          </View>

          <InfoRow label="Version" value={`${info.versionName} (${info.versionCode})`} />
          <InfoRow label="Min SDK" value={String(info.minSdkVersion)} />
          <InfoRow label="Target SDK" value={String(info.targetSdkVersion)} />

          {info.permissions.length > 0 && (
            <View style={styles.permissions}>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
                Permissions ({info.permissions.length})
              </Text>
              {info.permissions.map((perm) => (
                <Text key={perm} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                  {perm.replace('android.permission.', '')}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, width: 110 }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  icon: { width: 72, height: 72, borderRadius: 16 },
  iconFallback: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', paddingVertical: 10 },
  permissions: { marginTop: 16 },
});
