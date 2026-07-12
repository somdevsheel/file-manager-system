import { create } from 'zustand';
import { mmkv } from '@store/mmkvStorage';
import { SortField, SortOrder, ViewMode } from '@app-types/file';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThumbnailSize = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'settings-store';

interface PersistedSettings {
  themeMode: ThemeMode;
  useMaterialYou: boolean;
  defaultViewMode: ViewMode;
  defaultSortField: SortField;
  defaultSortOrder: SortOrder;
  thumbnailSize: ThumbnailSize;
  recycleBinRetentionDays: number;
  showHiddenFiles: boolean;
  language: string;
  hasCompletedOnboarding: boolean;
}

interface SettingsState extends PersistedSettings {
  setThemeMode: (mode: ThemeMode) => void;
  setUseMaterialYou: (enabled: boolean) => void;
  setDefaultViewMode: (mode: ViewMode) => void;
  setDefaultSort: (field: SortField, order: SortOrder) => void;
  setThumbnailSize: (size: ThumbnailSize) => void;
  setRecycleBinRetentionDays: (days: number) => void;
  setShowHiddenFiles: (show: boolean) => void;
  setLanguage: (language: string) => void;
  setHasCompletedOnboarding: (done: boolean) => void;
}

const DEFAULTS: PersistedSettings = {
  themeMode: 'system',
  useMaterialYou: true,
  defaultViewMode: 'list',
  defaultSortField: 'name',
  defaultSortOrder: 'asc',
  thumbnailSize: 'medium',
  recycleBinRetentionDays: 30,
  showHiddenFiles: false,
  language: 'en',
  hasCompletedOnboarding: false,
};

/**
 * Reads/writes MMKV directly rather than using zustand's `persist` middleware. That middleware
 * always resolves hydration via `.then()` — even for a synchronous storage backend — which per JS
 * semantics is deferred to a microtask at best. In practice that meant components could read
 * default (not-yet-hydrated) values on first render, and in one release build it crashed outright
 * ("MMKV can only be used when synchronous method invocations (JSI) are possible") because the
 * deferred read landed before native JSI bindings were confirmed ready. Reading MMKV directly here
 * is genuinely synchronous, so it's safe to call at store-creation time.
 */
function loadPersisted(): PersistedSettings {
  const raw = mmkv.getString(STORAGE_KEY);
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function persist(state: PersistedSettings): void {
  const {
    themeMode,
    useMaterialYou,
    defaultViewMode,
    defaultSortField,
    defaultSortOrder,
    thumbnailSize,
    recycleBinRetentionDays,
    showHiddenFiles,
    language,
    hasCompletedOnboarding,
  } = state;
  mmkv.set(
    STORAGE_KEY,
    JSON.stringify({
      themeMode,
      useMaterialYou,
      defaultViewMode,
      defaultSortField,
      defaultSortOrder,
      thumbnailSize,
      recycleBinRetentionDays,
      showHiddenFiles,
      language,
      hasCompletedOnboarding,
    }),
  );
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...loadPersisted(),

  setThemeMode: (themeMode) => {
    set({ themeMode });
    persist(get());
  },
  setUseMaterialYou: (useMaterialYou) => {
    set({ useMaterialYou });
    persist(get());
  },
  setDefaultViewMode: (defaultViewMode) => {
    set({ defaultViewMode });
    persist(get());
  },
  setDefaultSort: (defaultSortField, defaultSortOrder) => {
    set({ defaultSortField, defaultSortOrder });
    persist(get());
  },
  setThumbnailSize: (thumbnailSize) => {
    set({ thumbnailSize });
    persist(get());
  },
  setRecycleBinRetentionDays: (recycleBinRetentionDays) => {
    set({ recycleBinRetentionDays });
    persist(get());
  },
  setShowHiddenFiles: (showHiddenFiles) => {
    set({ showHiddenFiles });
    persist(get());
  },
  setLanguage: (language) => {
    set({ language });
    persist(get());
  },
  setHasCompletedOnboarding: (hasCompletedOnboarding) => {
    set({ hasCompletedOnboarding });
    persist(get());
  },
}));
