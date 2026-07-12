import { create } from 'zustand';
import { SortField, SortOrder, ViewMode } from '@app-types/file';

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

export const useFileBrowserStore = create<FileBrowserState>()((set, get) => ({
  viewMode: 'list',
  sortField: 'name',
  sortOrder: 'asc',
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
