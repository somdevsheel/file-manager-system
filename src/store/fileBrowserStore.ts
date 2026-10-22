import { create } from 'zustand';
import { SortField, SortOrder, ViewMode } from '@app-types/file';
import { useSettingsStore } from '@store/settingsStore';

export interface ClipboardState {
  paths: string[];
  mode: 'copy' | 'cut';
}

interface FileBrowserState {
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  selectionMode: boolean;
  selectedPaths: Set<string>;
  clipboard: ClipboardState | null;
  refreshToken: number;

  setViewMode: (mode: ViewMode) => void;
  setSort: (field: SortField, order: SortOrder) => void;
  toggleSortOrder: () => void;
  enterSelectionMode: (initialPath?: string) => void;
  exitSelectionMode: () => void;
  toggleSelected: (path: string) => void;
  selectAll: (paths: string[]) => void;
  clearSelection: () => void;
  setClipboard: (clipboard: ClipboardState | null) => void;
  triggerRefresh: () => void;
}

const initialSettings = useSettingsStore.getState();

export const useFileBrowserStore = create<FileBrowserState>()((set, get) => ({
  // Start from the user's saved defaults (Settings > Default view) rather than hardcoded values.
  viewMode: initialSettings.defaultViewMode,
  sortField: initialSettings.defaultSortField,
  sortOrder: initialSettings.defaultSortOrder,
  selectionMode: false,
  selectedPaths: new Set(),
  clipboard: null,
  refreshToken: 0,

  setViewMode: (viewMode) => set({ viewMode }),
  setSort: (sortField, sortOrder) => set({ sortField, sortOrder }),
  toggleSortOrder: () => set({ sortOrder: get().sortOrder === 'asc' ? 'desc' : 'asc' }),

  enterSelectionMode: (initialPath) =>
    set({
      selectionMode: true,
      selectedPaths: initialPath ? new Set([initialPath]) : new Set(),
    }),
  exitSelectionMode: () => set({ selectionMode: false, selectedPaths: new Set() }),

  toggleSelected: (path) => {
    const next = new Set(get().selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    set({ selectedPaths: next, selectionMode: next.size > 0 });
  },

  selectAll: (paths) => set({ selectedPaths: new Set(paths), selectionMode: paths.length > 0 }),
  clearSelection: () => set({ selectedPaths: new Set(), selectionMode: false }),

  setClipboard: (clipboard) => set({ clipboard }),
  triggerRefresh: () => set({ refreshToken: get().refreshToken + 1 }),
}));

// Changing the default in Settings applies right away, not just on the next cold start.
useSettingsStore.subscribe((state, prev) => {
  if (state.defaultViewMode !== prev.defaultViewMode) {
    useFileBrowserStore.getState().setViewMode(state.defaultViewMode);
  }
});
