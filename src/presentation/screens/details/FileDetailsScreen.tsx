import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Text, Divider } from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { FileService } from '@services/FileService';
import { FileIcon } from '@components/file/FileIcon';
import { FileEntry } from '@app-types/file';
import { CATEGORY_LABELS } from '@utils/fileCategory';
import { formatBytes, formatDate } from '@utils/format';
import { useAppTheme } from '@theme/ThemeProvider';

export function FileDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'FileDetails'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { path } = route.params;

  const [entry, setEntry] = useState<FileEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    FileService.getFileInfo(path)
      .then(setEntry)
      .finally(() => setLoading(false));
  }, [path]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Details" />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Loading…</Text>
        </View>
      ) : !entry ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Couldn't read this file's details.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <FileIcon entry={entry} size={64} />
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginTop: 12, textAlign: 'center' }}>
              {entry.name}
            </Text>
          </View>

          <DetailRow label="Location" value={entry.path} />
          <Divider />
          <DetailRow label="Type" value={entry.isDirectory ? 'Folder' : CATEGORY_LABELS[entry.category]} />
          <Divider />
          {!entry.isDirectory && (
            <>
              <DetailRow label="Size" value={formatBytes(entry.size)} />
              <Divider />
            </>
          )}
          {!entry.isDirectory && entry.extension && (
            <>
              <DetailRow label="Extension" value={`.${entry.extension}`} />
              <Divider />
            </>
          )}
          <DetailRow label="Modified" value={formatDate(entry.modifiedAt)} />
          <Divider />
          <DetailRow label="Created" value={formatDate(entry.createdAt)} />
          <Divider />
          <DetailRow label="Hidden" value={entry.isHidden ? 'Yes' : 'No'} />
          <Divider />
          <DetailRow label="Writable" value={entry.canWrite ? 'Yes' : 'No'} />
        </ScrollView>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, width: 100 }}>
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
  content: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  row: { flexDirection: 'row', paddingVertical: 14 },
});
