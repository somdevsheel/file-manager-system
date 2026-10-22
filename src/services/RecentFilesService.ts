import { RecentFilesDao } from '@database/dao/RecentFilesDao';
import { RecentFileEntry } from '@app-types/file';
import { isInVault } from '@services/LockedFilesService';

export const RecentFilesService = {
  getAll(limit?: number): Promise<RecentFileEntry[]> {
    return RecentFilesDao.getAll(limit);
  },
  record(path: string, name: string): Promise<void> {
    // Recording a vault item's path in "Recent" would leak its existence outside the vault.
    if (isInVault(path)) return Promise.resolve();
    return RecentFilesDao.record(path, name).catch(() => {});
  },
  clear(): Promise<void> {
    return RecentFilesDao.clear();
  },
};
