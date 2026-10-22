import { Alert, Platform, ToastAndroid } from 'react-native';

/** Short, non-blocking message for the user (a toast on Android, an alert elsewhere). */
export function notify(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
}

/** Reports a failed operation to the user instead of letting the rejection vanish silently. */
export function notifyError(error: unknown, fallback = 'Something went wrong'): void {
  const message = (error as { message?: string } | null)?.message;
  notify(message && message.length > 0 ? message : fallback);
}
