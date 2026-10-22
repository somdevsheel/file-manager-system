import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useFileBrowserStore } from '@store/fileBrowserStore';

/**
 * Selection state lives in a global store shared by every file list screen, so a screen using it
 * must (a) let the hardware back button leave selection mode before it navigates away, and (b)
 * clear the selection when it loses focus — otherwise "3 selected" (with paths from this folder)
 * carries over into whichever screen is shown next.
 */
export function useSelectionModeLifecycle() {
  const selectionMode = useFileBrowserStore((s) => s.selectionMode);
  const exitSelectionMode = useFileBrowserStore((s) => s.exitSelectionMode);

  useFocusEffect(
    useCallback(() => {
      if (!selectionMode) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        exitSelectionMode();
        return true;
      });
      return () => sub.remove();
    }, [selectionMode, exitSelectionMode]),
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (useFileBrowserStore.getState().selectionMode) exitSelectionMode();
      };
    }, [exitSelectionMode]),
  );
}
