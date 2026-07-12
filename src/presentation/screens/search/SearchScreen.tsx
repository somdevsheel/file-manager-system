import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Searchbar, Chip, ActivityIndicator } from 'react-native-paper';
import { FlashList } from '@shopify/flash-list';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { SearchService } from '@services/SearchService';
import { RecentFilesService } from '@services/RecentFilesService';
import { FileListItem } from '@components/file/FileListItem';
import { EmptyState } from '@components/common/EmptyState';
import { useActionSheetStore } from '@store/actionSheetStore';
import { FileCategory, FileEntry } from '@app-types/file';
import { CATEGORY_LABELS } from '@utils/fileCategory';
import { openFilePreview } from '@utils/openFilePreview';
import { useAppTheme } from '@theme/ThemeProvider';

const FILTER_CATEGORIES = [
  FileCategory.Image,
  FileCategory.Video,
  FileCategory.Audio,
  FileCategory.Pdf,
  FileCategory.Document,
  FileCategory.Apk,
  FileCategory.Zip,
];

export function SearchScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Search'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const { rootPath } = route.params;

  const [query, setQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<FileCategory[]>([]);
  const [results, setResults] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query.trim().length === 0 && activeCategories.length === 0) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const found = await SearchService.search(rootPath, {
          query: query.trim(),
          categories: activeCategories.length > 0 ? activeCategories : undefined,
          rootPath,
        });
        setResults(found);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query, activeCategories, rootPath]);

  const toggleCategory = (category: FileCategory) => {
    setActiveCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const handlePress = (entry: FileEntry) => {
    if (entry.isDirectory) {
      navigation.navigate('Browser', { path: entry.path, title: entry.name });
    } else {
      RecentFilesService.record(entry.path, entry.name);
      openFilePreview(entry.path, entry.category);
    }
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }
    if (!searched) {
      return <EmptyState icon="magnify" title="Search this device" subtitle="Type a name or pick a category filter." />;
    }
    if (results.length === 0) {
      return <EmptyState icon="file-search-outline" title="No results" subtitle="Try a different search term or filter." />;
    }
    return (
      <FlashList
        data={results}
        renderItem={({ item }) => (
          <FileListItem
            entry={item}
            selected={false}
            selectionMode={false}
            onPress={handlePress}
            onLongPress={() => {}}
            onMorePress={(entry) => useActionSheetStore.getState().open(entry)}
          />
        )}
        keyExtractor={(item) => item.path}
        estimatedItemSize={64}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searched, results, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search files"
          value={query}
          onChangeText={setQuery}
          icon="arrow-left"
          onIconPress={() => navigation.goBack()}
          autoFocus
          style={styles.searchbar}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTER_CATEGORIES.map((category) => (
            <Chip
              key={category}
              selected={activeCategories.includes(category)}
              onPress={() => toggleCategory(category)}
              style={styles.chip}
              compact
            >
              {CATEGORY_LABELS[category]}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 8 },
  searchbar: { marginHorizontal: 12, elevation: 0 },
  chipRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { marginRight: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
