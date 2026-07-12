import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Text, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { FileService } from '@services/FileService';
import { FileListItem } from '@components/file/FileListItem';
import { FileEntry, FolderStatistics } from '@app-types/file';
import { openFilePreview } from '@utils/openFilePreview';
import { formatBytes } from '@utils/format';
import { useAppTheme } from '@theme/ThemeProvider';

export function FolderStatisticsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'FolderStatistics'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { path } = route.params;

  const [stats, setStats] = useState<FolderStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    FileService.computeFolderStats(path)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [path]);

  const handleOpenEntry = (entry: FileEntry) => {
    if (entry.isDirectory) {
      navigation.navigate('Browser', { path: entry.path, title: entry.name });
    } else {
      openFilePreview(entry.path, entry.category);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Folder statistics" subtitle={path} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : !stats ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Couldn't compute statistics.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statGrid}>
            <StatCard icon="file-outline" label="Files" value={String(stats.totalFiles)} />
            <StatCard icon="folder-outline" label="Folders" value={String(stats.totalFolders)} />
            <StatCard icon="database-outline" label="Total size" value={formatBytes(stats.totalSize)} />
          </View>

          {stats.largestFile && (
            <Section title="Largest file">
              <FileListItem
                entry={stats.largestFile}
                selected={false}
                selectionMode={false}
                onPress={handleOpenEntry}
                onLongPress={() => {}}
              />
            </Section>
          )}
          {stats.newestFile && (
            <Section title="Newest file">
              <FileListItem
                entry={stats.newestFile}
                selected={false}
                selectionMode={false}
                onPress={handleOpenEntry}
                onLongPress={() => {}}
              />
            </Section>
          )}
          {stats.oldestFile && (
            <Section title="Oldest file">
              <FileListItem
                entry={stats.oldestFile}
                selected={false}
                selectionMode={false}
                onPress={handleOpenEntry}
                onLongPress={() => {}}
              />
            </Section>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.colors.elevation.level1, borderRadius: theme.custom.radius.md },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} />
      <Text variant="titleLarge" style={{ color: theme.colors.primary, marginTop: 4 }}>
        {value}
      </Text>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  statGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  section: { marginTop: 20 },
});
