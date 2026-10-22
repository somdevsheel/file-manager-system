import { useCallback, useEffect, useRef, useState } from 'react';
import { FileService } from '@services/FileService';
import { FileEntry } from '@app-types/file';
import { useFileBrowserStore } from '@store/fileBrowserStore';
import { useSettingsStore } from '@store/settingsStore';

export function useDirectoryListing(path: string) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only the most recent request may update state: a slow listing that started before a sort
  // change / refresh must not overwrite the newer result when it finally resolves.
  const requestIdRef = useRef(0);

  const sortField = useFileBrowserStore((s) => s.sortField);
  const sortOrder = useFileBrowserStore((s) => s.sortOrder);
  const refreshToken = useFileBrowserStore((s) => s.refreshToken);
  const showHiddenFiles = useSettingsStore((s) => s.showHiddenFiles);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const raw = await FileService.listDirectory(path);
      if (requestId !== requestIdRef.current) return;
      const filtered = showHiddenFiles ? raw : raw.filter((e) => !e.isHidden);
      setEntries(FileService.sortEntries(filtered, { field: sortField, order: sortOrder }));
    } catch (e: any) {
      if (requestId !== requestIdRef.current) return;
      setError(e?.message ?? 'Failed to read this folder');
      setEntries([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [path, sortField, sortOrder, showHiddenFiles]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  useEffect(() => {
    const requestIds = requestIdRef;
    return () => {
      requestIds.current++; // ignore anything still in flight after unmount
    };
  }, []);

  return { entries, loading, error, reload: load };
}
