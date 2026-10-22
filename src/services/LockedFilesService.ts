import RNFS from 'react-native-fs';
import { FileOperationsNative } from '@native/modules';
import { LockedFilesDao } from '@database/dao/LockedFilesDao';
import { FavoritesDao } from '@database/dao/FavoritesDao';
import { RecentFilesDao } from '@database/dao/RecentFilesDao';
import { FileService } from '@services/FileService';
import { FileEntry, LockedFileEntry } from '@app-types/file';
import { generateId } from '@utils/id';

const VAULT_DIR_NAME = '.vault';

/** App-private internal storage — unlike the Recycle Bin's dot-folder on shared storage, this
 *  directory is sandboxed by Android and unreadable by any other app, including other file
 *  managers with All Files Access. */
function vaultDir(): string {
  return FileService.joinPath(RNFS.DocumentDirectoryPath, VAULT_DIR_NAME);
}

/** True for anything stored inside the vault — such paths must never leak into Recent/Favorites. */
export function isInVault(path: string): boolean {
  const dir = vaultDir();
  return path === dir || path.startsWith(`${dir}/`);
}

export const LockedFilesService = {
  async getAll(): Promise<LockedFileEntry[]> {
    return LockedFilesDao.getAll();
  },

  /** Moves entries into the private vault directory and records metadata for restore. */
  async lock(entries: FileEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const operationId = generateId('lock');
    const destinationPaths = await FileOperationsNative.moveEntries(
      entries.map((e) => e.path),
      vaultDir(),
      operationId,
    );
    for (let i = 0; i < destinationPaths.length; i++) {
      const original = entries[i];
      if (!original) continue;
      await LockedFilesDao.add({
        originalPath: original.path,
        vaultPath: destinationPaths[i],
        name: original.name,
        isDirectory: original.isDirectory,
        size: original.size,
      });
      // The original location no longer exists; don't keep pointing Recent/Favorites at it.
      await FavoritesDao.removeTree(original.path);
      await RecentFilesDao.removeTree(original.path);
    }
  },

  async unlock(entry: LockedFileEntry): Promise<void> {
    const destDir = FileService.parentPath(entry.originalPath);
    const operationId = generateId('unlock');
    await FileOperationsNative.moveEntries([entry.vaultPath], destDir, operationId);
    await LockedFilesDao.remove(entry.id);
  },

  async deleteForever(entry: LockedFileEntry): Promise<void> {
    const operationId = generateId('purge');
    await FileOperationsNative.deleteEntries([entry.vaultPath], operationId);
    await LockedFilesDao.remove(entry.id);
  },
};
