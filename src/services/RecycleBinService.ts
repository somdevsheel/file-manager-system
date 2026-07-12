import { RecycleBinDao } from '@database/dao/RecycleBinDao';
import { FileOperationsNative } from '@native/modules';
import { RecycleBinEntry } from '@app-types/file';
import { generateId } from '@utils/id';

export const RecycleBinService = {
  async getAll(): Promise<RecycleBinEntry[]> {
    return RecycleBinDao.getAll();
  },

  async restore(entry: RecycleBinEntry): Promise<void> {
    const destDir = entry.originalPath.slice(0, entry.originalPath.lastIndexOf('/')) || '/';
    const operationId = generateId('restore');
    await FileOperationsNative.moveEntries([entry.trashPath], destDir, operationId);
    await RecycleBinDao.remove(entry.id);
  },

  async deleteForever(entry: RecycleBinEntry): Promise<void> {
    const operationId = generateId('purge');
    await FileOperationsNative.deleteEntries([entry.trashPath], operationId);
    await RecycleBinDao.remove(entry.id);
  },

  async emptyBin(entries: RecycleBinEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const operationId = generateId('purge');
    await FileOperationsNative.deleteEntries(entries.map((e) => e.trashPath), operationId);
    await RecycleBinDao.clear();
  },

  /** Should run on app start: purges anything older than the configured retention window. */
  async runAutoCleanup(retentionDays: number): Promise<number> {
    const expired = await RecycleBinDao.getExpired(retentionDays);
    if (expired.length === 0) return 0;
    const operationId = generateId('autocleanup');
    await FileOperationsNative.deleteEntries(expired.map((e) => e.trashPath), operationId);
    for (const entry of expired) {
      await RecycleBinDao.remove(entry.id);
    }
    return expired.length;
  },
};
