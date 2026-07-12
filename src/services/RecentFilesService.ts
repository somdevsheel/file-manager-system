import { RecentFilesDao } from '@database/dao/RecentFilesDao';
import { RecentFileEntry } from '@app-types/file';

export const RecentFilesService = {
  getAll(limit?: number): Promise<RecentFileEntry[]> {
    return RecentFilesDao.getAll(limit);
  },
  record(path: string, name: string): Promise<void> {
    return RecentFilesDao.record(path, name);
  },
  clear(): Promise<void> {
    return RecentFilesDao.clear();
  },
};
