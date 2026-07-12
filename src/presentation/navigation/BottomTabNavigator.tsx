import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MainTabParamList } from '@navigation/types';
import { HomeScreen } from '@screens/home/HomeScreen';
import { CategoriesScreen } from '@screens/categories/CategoriesScreen';
import { SettingsScreen } from '@screens/settings/SettingsScreen';
import { BrowserScreen } from '@screens/browser/BrowserScreen';
import { useAppTheme } from '@theme/ThemeProvider';
import { useStorageStore } from '@store/storageStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, string> = {
  HomeTab: 'home-variant-outline',
  BrowserTab: 'folder-outline',
  CategoriesTab: 'view-grid-outline',
  SettingsTab: 'cog-outline',
};

const ACTIVE_ICONS: Record<keyof MainTabParamList, string> = {
  HomeTab: 'home-variant',
  BrowserTab: 'folder',
  CategoriesTab: 'view-grid',
  SettingsTab: 'cog',
};

function BrowserTabScreen() {
  const primaryVolume = useStorageStore((s) => s.primaryVolume);
  return <BrowserScreen path={primaryVolume?.path ?? '/storage/emulated/0'} title="Internal Storage" isRoot />;
}

export function BottomTabNavigator() {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.elevation.level2,
          borderTopColor: theme.colors.outlineVariant,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => (
          <MaterialCommunityIcons
            name={focused ? ACTIVE_ICONS[route.name as keyof MainTabParamList] : ICONS[route.name as keyof MainTabParamList]}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="BrowserTab" component={BrowserTabScreen} options={{ tabBarLabel: 'Files' }} />
      <Tab.Screen name="CategoriesTab" component={CategoriesScreen} options={{ tabBarLabel: 'Categories' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}
