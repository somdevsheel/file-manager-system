import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { QuickAccessTile } from '@components/dashboard/QuickAccessTile';
import { FileCategory } from '@app-types/file';
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@utils/fileCategory';
import { useStorageStore } from '@store/storageStore';
import { useAppTheme } from '@theme/ThemeProvider';

const CATEGORIES = Object.values(FileCategory).filter(
  (c) => c !== FileCategory.Folder && c !== FileCategory.Unknown,
) as FileCategory[];

export function CategoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const primaryVolume = useStorageStore((s) => s.primaryVolume);
  const rootPath = primaryVolume?.path ?? '/storage/emulated/0';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated={false}>
        <Appbar.Content title="Categories" titleStyle={{ fontWeight: '700' }} />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.grid}>
        {CATEGORIES.map((category) => (
          <QuickAccessTile
            key={category}
            icon={CATEGORY_ICONS[category]}
            label={CATEGORY_LABELS[category]}
            color={theme.custom.categoryAccentColors[category] ?? theme.colors.primary}
            onPress={() => navigation.navigate('Category', { category, rootPath })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
});
