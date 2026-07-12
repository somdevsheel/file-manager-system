/**
 * @format
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppState, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useIsDarkTheme } from '@theme/ThemeProvider';
import { RootNavigator } from '@navigation/RootNavigator';
import { OperationsListener } from '@components/sheets/OperationsListener';
import { ProgressBanner } from '@components/sheets/ProgressBanner';
import { FileActionSheet } from '@components/sheets/FileActionSheet';
import { ConfirmDialogHost } from '@components/sheets/ConfirmDialogHost';
import { InputDialogHost } from '@components/sheets/InputDialogHost';
import { PermissionGateScreen } from '@screens/onboarding/PermissionGateScreen';
import { useStorageStore } from '@store/storageStore';
import { useSettingsStore } from '@store/settingsStore';
import { PermissionService } from '@services/PermissionService';
import { RecycleBinService } from '@services/RecycleBinService';

function AppContent() {
  const isDark = useIsDarkTheme();
  const loadVolumes = useStorageStore((s) => s.load);
  const recycleBinRetentionDays = useSettingsStore((s) => s.recycleBinRetentionDays);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const checkAccess = async () => {
      setHasAccess(await PermissionService.hasAllFilesAccess());
    };
    checkAccess();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkAccess();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!hasAccess || startedRef.current) return;
    startedRef.current = true;
    (async () => {
      await PermissionService.requestMediaPermissions();
      await PermissionService.requestNotificationPermission();
      await loadVolumes();
      await RecycleBinService.runAutoCleanup(recycleBinRetentionDays);
    })();
    // Runs once after access is granted; retention day changes apply on the next app launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  if (hasAccess === null) return null;

  if (!hasAccess) {
    return (
      <>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <PermissionGateScreen onRequestAccess={() => PermissionService.requestAllFilesAccess()} />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <OperationsListener />
      <RootNavigator />
      <ProgressBanner />
      <FileActionSheet />
      <ConfirmDialogHost />
      <InputDialogHost />
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
