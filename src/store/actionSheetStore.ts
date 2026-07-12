import { create } from 'zustand';
import { FileEntry } from '@app-types/file';

interface ActionSheetState {
  target: FileEntry | null;
  open: (entry: FileEntry) => void;
  close: () => void;
}

export const useActionSheetStore = create<ActionSheetState>()((set) => ({
  target: null,
  open: (entry) => set({ target: entry }),
  close: () => set({ target: null }),
}));
