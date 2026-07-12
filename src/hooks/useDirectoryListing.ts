import { useCallback, useEffect, useState } from 'react';
import { FileService } from '@services/FileService';
import { FileEntry } from '@app-types/file';
import { useFileBrowserStore } from '@store/fileBrowserStore';
import { useSettingsStore } from '@store/settingsStore';

export function useDirectoryListing(path: string) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortField = useFileBrowserStore((s) => s.sortField);
  const sortOrder = useFileBrowserStore((s) => s.sortOrder);
  const refreshToken = useFileBrowserStore((s) => s.refreshToken);
  const showHiddenFiles = useSettingsStore((s) => s.showHiddenFiles);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await FileService.listDirectory(path);
      const filtered = showHiddenFiles ? raw : raw.filter((e) => !e.isHidden);
      setEntries(FileService.sortEntries(filtered, { field: sortField, order: sortOrder }));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to read this folder');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [path, sortField, sortOrder, showHiddenFiles]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  return { entries, loading, error, reload: load };
}
