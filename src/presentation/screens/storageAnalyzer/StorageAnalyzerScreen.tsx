import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Text, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { StorageAnalyzerService, StorageAnalysis } from '@services/StorageAnalyzerService';
import { FileListItem } from '@components/file/FileListItem';
import { FileCategory } from '@app-types/file';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@utils/fileCategory';
import { openFilePreview } from '@utils/openFilePreview';
import { formatBytes } from '@utils/format';
import { useAppTheme } from '@theme/ThemeProvider';

export function StorageAnalyzerScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'StorageAnalyzer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { rootPath } = route.params;

  const [analysis, setAnalysis] = useState<StorageAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    StorageAnalyzerService.analyze(rootPath)
      .then(setAnalysis)
      .finally(() => setLoading(false));
  }, [rootPath]);

  const totalSize = analysis?.categoryBreakdown.reduce((sum, c) => sum + c.size, 0) ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Storage Analyzer" />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : !analysis ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Couldn't analyze storage.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {totalSize > 0 && (
            <View style={[styles.breakdownBar, { backgroundColor: theme.colors.elevation.level2 }]}>
              {analysis.categoryBreakdown
                .filter((c) => c.size > 0)
                .map((c) => (
                  <View
                    key={c.category}
                    style={{
                      flex: c.size / totalSize,
                      backgroundColor: theme.custom.categoryAccentColors[c.category] ?? theme.colors.outline,
                    }}
                  />
                ))}
            </View>
          )}

          <SectionTitle title="By category" />
          {analysis.categoryBreakdown
            .filter((c) => c.count > 0)
            .sort((a, b) => b.size - a.size)
            .map((c) => (
              <CategoryRow
                key={c.category}
                category={c.category as FileCategory}
                size={c.size}
                count={c.count}
                onPress={() =>
                  navigation.navigate('Category', { category: c.category as FileCategory, rootPath })
                }
              />
            ))}

          {analysis.topLevelFolders.length > 0 && (
            <>
              <SectionTitle title="Top-level folders" />
              {analysis.topLevelFolders
                .slice()
                .sort((a, b) => b.size - a.size)
                .map((folder) => (
                  <FolderRow
                    key={folder.path}
                    name={folder.name}
                    size={folder.size}
                    onPress={() => navigation.navigate('Browser', { path: folder.path, title: folder.name })}
                  />
                ))}
            </>
          )}

          {analysis.largestFiles.length > 0 && (
            <>
              <SectionTitle title="Largest files" />
              {analysis.largestFiles.slice(0, 20).map((file) => (
                <FileListItem
                  key={file.path}
                  entry={file}
                  selected={false}
                  selectionMode={false}
                  onPress={(entry) => openFilePreview(entry.path, entry.category)}
                  onLongPress={() => {}}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const theme = useAppTheme();
  return (
    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginTop: 20, marginBottom: 4, paddingHorizontal: 16 }}>
      {title}
    </Text>
  );
}

function CategoryRow({
  category,
  size,
  count,
  onPress,
}: {
  category: FileCategory;
  size: number;
  count: number;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const accent = theme.custom.categoryAccentColors[category] ?? theme.colors.primary;
  return (
    <View style={styles.row} onTouchEnd={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}24`, borderRadius: theme.custom.radius.sm }]}>
        <MaterialCommunityIcons name={CATEGORY_ICONS[category]} size={20} color={accent} />
      </View>
      <View style={styles.textBlock}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
          {CATEGORY_LABELS[category]}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {count} item{count === 1 ? '' : 's'}
        </Text>
      </View>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {formatBytes(size)}
      </Text>
    </View>
  );
}

function FolderRow({ name, size, onPress }: { name: string; size: number; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.row} onTouchEnd={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.elevation.level2, borderRadius: theme.custom.radius.sm }]}>
        <MaterialCommunityIcons name="folder-outline" size={20} color={theme.colors.onSurfaceVariant} />
      </View>
      <View style={styles.textBlock}>
        <Text variant="bodyLarge" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {name}
        </Text>
      </View>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {formatBytes(size)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 32 },
  breakdownBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1, justifyContent: 'center' },
});
