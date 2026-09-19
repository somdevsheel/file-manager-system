import React from 'react';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { BottomTabNavigator } from '@navigation/BottomTabNavigator';
import { BrowserScreen } from '@screens/browser/BrowserScreen';
import { SearchScreen } from '@screens/search/SearchScreen';
import { CategoryListScreen } from '@screens/categories/CategoryListScreen';
import { FavoritesScreen } from '@screens/favorites/FavoritesScreen';
import { RecentScreen } from '@screens/recent/RecentScreen';
import { StorageAnalyzerScreen } from '@screens/storageAnalyzer/StorageAnalyzerScreen';
import { DuplicateFinderScreen } from '@screens/duplicates/DuplicateFinderScreen';
import { LargeFileFinderScreen } from '@screens/largeFiles/LargeFileFinderScreen';
import { RecycleBinScreen } from '@screens/recycleBin/RecycleBinScreen';
import { LockedScreen } from '@screens/locked/LockedScreen';
import { ZipManagerScreen } from '@screens/zip/ZipManagerScreen';
import { ImageViewerScreen } from '@screens/preview/ImageViewerScreen';
import { VideoPlayerScreen } from '@screens/preview/VideoPlayerScreen';
import { AudioPlayerScreen } from '@screens/preview/AudioPlayerScreen';
import { PdfViewerScreen } from '@screens/preview/PdfViewerScreen';
import { TextViewerScreen } from '@screens/preview/TextViewerScreen';
import { ApkDetailsScreen } from '@screens/apk/ApkDetailsScreen';
import { FileDetailsScreen } from '@screens/details/FileDetailsScreen';
import { FolderStatisticsScreen } from '@screens/details/FolderStatisticsScreen';
import { SettingsScreen } from '@screens/settings/SettingsScreen';
import { useNavTheme } from '@theme/ThemeProvider';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from '@navigation/navigationRef';

const Stack = createNativeStackNavigator<RootStackParamList>();

function BrowserRoute({ route }: NativeStackScreenProps<RootStackParamList, 'Browser'>) {
  return <BrowserScreen path={route.params.path} title={route.params.title} />;
}

export function RootNavigator() {
  const navTheme = useNavTheme();

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Main" component={BottomTabNavigator} />
        <Stack.Screen name="Browser" component={BrowserRoute} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Category" component={CategoryListScreen} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="Recent" component={RecentScreen} />
        <Stack.Screen name="StorageAnalyzer" component={StorageAnalyzerScreen} />
        <Stack.Screen name="DuplicateFinder" component={DuplicateFinderScreen} />
        <Stack.Screen name="LargeFileFinder" component={LargeFileFinderScreen} />
        <Stack.Screen name="RecycleBin" component={RecycleBinScreen} />
        <Stack.Screen name="Locked" component={LockedScreen} />
        <Stack.Screen name="ZipManager" component={ZipManagerScreen} />
        <Stack.Screen name="ImageViewer" component={ImageViewerScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="AudioPlayer" component={AudioPlayerScreen} />
        <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
        <Stack.Screen name="TextViewer" component={TextViewerScreen} />
        <Stack.Screen name="ApkDetails" component={ApkDetailsScreen} />
        <Stack.Screen name="FileDetails" component={FileDetailsScreen} />
        <Stack.Screen name="FolderStatistics" component={FolderStatisticsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
