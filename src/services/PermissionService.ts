import { PermissionsAndroid, Platform } from 'react-native';
import { FileSystemNative } from '@native/modules';

export const PermissionService = {
  async hasAllFilesAccess(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    return FileSystemNative.hasAllFilesAccess();
  },

  /** Opens the system "All files access" settings screen for this app. */
  requestAllFilesAccess(): void {
    FileSystemNative.requestAllFilesAccess();
  },

  /** Android 13+ granular media permissions, used when the user declines All Files Access. */
  async requestMediaPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version < 33) return true;
    const permissions = [
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
    ];
    const results = await PermissionsAndroid.requestMultiple(permissions);
    return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  },

  async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || Platform.Version < 33) return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  },
};
