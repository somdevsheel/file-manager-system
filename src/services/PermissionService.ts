import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { FileSystemNative } from '@native/modules';

// Android 11 (API 30) introduced "All files access"; older versions use the classic runtime permissions.
const ALL_FILES_ACCESS_MIN_SDK = 30;

export const PermissionService = {
  async hasAllFilesAccess(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    return FileSystemNative.hasAllFilesAccess();
  },

  /**
   * Android 11+: opens the system "All files access" settings screen for this app (the caller
   * re-checks when the app returns to the foreground). Android 7-10: shows the runtime storage
   * permission dialog, or app settings if the user previously chose "Don't ask again".
   */
  async requestAllFilesAccess(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (Platform.Version >= ALL_FILES_ACCESS_MIN_SDK) {
      FileSystemNative.requestAllFilesAccess();
      return;
    }
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    ]);
    if (Object.values(results).some((r) => r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
      await Linking.openSettings();
    }
  },

  async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || Platform.Version < 33) return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  },
};
