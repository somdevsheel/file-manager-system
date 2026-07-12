import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, List, Switch, Menu, Divider, Text } from 'react-native-paper';
import { useSettingsStore, ThemeMode, ThumbnailSize } from '@store/settingsStore';
import { useAppTheme } from '@theme/ThemeProvider';

const THEME_LABELS: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System default' };
const THUMBNAIL_LABELS: Record<ThumbnailSize, string> = { small: 'Small', medium: 'Medium', large: 'Large' };
const RETENTION_OPTIONS = [7, 15, 30, 60, 90];

export function SettingsScreen() {
  const theme = useAppTheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const useMaterialYou = useSettingsStore((s) => s.useMaterialYou);
  const setUseMaterialYou = useSettingsStore((s) => s.setUseMaterialYou);
  const defaultViewMode = useSettingsStore((s) => s.defaultViewMode);
  const setDefaultViewMode = useSettingsStore((s) => s.setDefaultViewMode);
  const showHiddenFiles = useSettingsStore((s) => s.showHiddenFiles);
  const setShowHiddenFiles = useSettingsStore((s) => s.setShowHiddenFiles);
  const thumbnailSize = useSettingsStore((s) => s.thumbnailSize);
  const setThumbnailSize = useSettingsStore((s) => s.setThumbnailSize);
  const recycleBinRetentionDays = useSettingsStore((s) => s.recycleBinRetentionDays);
  const setRecycleBinRetentionDays = useSettingsStore((s) => s.setRecycleBinRetentionDays);

  const [themeMenuVisible, setThemeMenuVisible] = useState(false);
  const [thumbnailMenuVisible, setThumbnailMenuVisible] = useState(false);
  const [retentionMenuVisible, setRetentionMenuVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated={false}>
        <Appbar.Content title="Settings" titleStyle={{ fontWeight: '700' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          <Menu
            visible={themeMenuVisible}
            onDismiss={() => setThemeMenuVisible(false)}
            anchor={
              <List.Item
                title="Theme"
                description={THEME_LABELS[themeMode]}
                left={(p) => <List.Icon {...p} icon="theme-light-dark" />}
                onPress={() => setThemeMenuVisible(true)}
              />
            }
          >
            {(Object.keys(THEME_LABELS) as ThemeMode[]).map((mode) => (
              <Menu.Item
                key={mode}
                title={THEME_LABELS[mode]}
                leadingIcon={themeMode === mode ? 'check' : undefined}
                onPress={() => {
                  setThemeMode(mode);
                  setThemeMenuVisible(false);
                }}
              />
            ))}
          </Menu>
          <List.Item
            title="Material You"
            description="Use wallpaper-based dynamic color (Android 12+)"
            left={(p) => <List.Icon {...p} icon="palette-outline" />}
            right={() => <Switch value={useMaterialYou} onValueChange={setUseMaterialYou} />}
            onPress={() => setUseMaterialYou(!useMaterialYou)}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Browsing</List.Subheader>
          <List.Item
            title="Default view"
            description={defaultViewMode === 'list' ? 'List' : 'Grid'}
            left={(p) => <List.Icon {...p} icon="view-list-outline" />}
            right={() => (
              <Switch
                value={defaultViewMode === 'grid'}
                onValueChange={(v) => setDefaultViewMode(v ? 'grid' : 'list')}
              />
            )}
          />
          <Menu
            visible={thumbnailMenuVisible}
            onDismiss={() => setThumbnailMenuVisible(false)}
            anchor={
              <List.Item
                title="Thumbnail size"
                description={THUMBNAIL_LABELS[thumbnailSize]}
                left={(p) => <List.Icon {...p} icon="image-size-select-large" />}
                onPress={() => setThumbnailMenuVisible(true)}
              />
            }
          >
            {(Object.keys(THUMBNAIL_LABELS) as ThumbnailSize[]).map((size) => (
              <Menu.Item
                key={size}
                title={THUMBNAIL_LABELS[size]}
                leadingIcon={thumbnailSize === size ? 'check' : undefined}
                onPress={() => {
                  setThumbnailSize(size);
                  setThumbnailMenuVisible(false);
                }}
              />
            ))}
          </Menu>
          <List.Item
            title="Show hidden files"
            left={(p) => <List.Icon {...p} icon="eye-outline" />}
            right={() => <Switch value={showHiddenFiles} onValueChange={setShowHiddenFiles} />}
            onPress={() => setShowHiddenFiles(!showHiddenFiles)}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Storage</List.Subheader>
          <Menu
            visible={retentionMenuVisible}
            onDismiss={() => setRetentionMenuVisible(false)}
            anchor={
              <List.Item
                title="Recycle Bin retention"
                description={`${recycleBinRetentionDays} days`}
                left={(p) => <List.Icon {...p} icon="trash-can-outline" />}
                onPress={() => setRetentionMenuVisible(true)}
              />
            }
          >
            {RETENTION_OPTIONS.map((days) => (
              <Menu.Item
                key={days}
                title={`${days} days`}
                leadingIcon={recycleBinRetentionDays === days ? 'check' : undefined}
                onPress={() => {
                  setRecycleBinRetentionDays(days);
                  setRetentionMenuVisible(false);
                }}
              />
            ))}
          </Menu>
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>About</List.Subheader>
          <List.Item title="Version" description="0.0.1" left={(p) => <List.Icon {...p} icon="information-outline" />} />
        </List.Section>

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 16 }}>
          File Manager
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
