import { FileOperationsNative, fileOperationsEmitter } from '@native/modules';
import { FileEntry, FileOperationProgress } from '@app-types/file';
import { FileService } from '@services/FileService';
import { RecycleBinDao } from '@database/dao/RecycleBinDao';
import { useOperationsStore } from '@store/operationsStore';
import { generateId } from '@utils/id';

export const TRASH_DIR_NAME = '.FileManagerTrash';

export type ProgressListener = (progress: FileOperationProgress) => void;

function subscribe(operationId: string, onProgress?: ProgressListener) {
  if (!onProgress) return { remove: () => {} };
  return fileOperationsEmitter.addListener('FileOperationProgress', (event: FileOperationProgress) => {
    if (event.operationId === operationId) onProgress(event);
  });
}

/** Generates an id up front and registers a human-readable label so the ProgressBanner has
 *  something to show the instant the first native progress event arrives. */
function beginOperation(label: string): string {
  const operationId = generateId('op');
  useOperationsStore.getState().registerLabel(operationId, label);
  return operationId;
}

function labelFor(paths: string[]): string {
  if (paths.length === 1) return paths[0].split('/').pop() ?? paths[0];
  return `${paths.length} items`;
}

export const FileOperationsService = {
  cancel(operationId: string): void {
    FileOperationsNative.cancelOperation(operationId);
  },

  async copy(sourcePaths: string[], destDir: string, onProgress?: ProgressListener): Promise<string[]> {
    const operationId = beginOperation(labelFor(sourcePaths));
    const subscription = subscribe(operationId, onProgress);
    try {
      return await FileOperationsNative.copyEntries(sourcePaths, destDir, operationId);
    } finally {
      subscription.remove();
    }
  },

  async move(sourcePaths: string[], destDir: string, onProgress?: ProgressListener): Promise<string[]> {
    const operationId = beginOperation(labelFor(sourcePaths));
    const subscription = subscribe(operationId, onProgress);
    try {
      return await FileOperationsNative.moveEntries(sourcePaths, destDir, operationId);
    } finally {
      subscription.remove();
    }
  },

  /** Permanent delete — bypasses the recycle bin. Prefer moveToTrash() for user-initiated deletes. */
  async deletePermanently(paths: string[], onProgress?: ProgressListener): Promise<boolean> {
    const operationId = beginOperation(labelFor(paths));
    const subscription = subscribe(operationId, onProgress);
    try {
      return await FileOperationsNative.deleteEntries(paths, operationId);
    } finally {
      subscription.remove();
    }
  },

  async duplicate(path: string): Promise<FileEntry> {
    return FileOperationsNative.duplicateEntry(path);
  },

  /** Moves entries into the app's hidden trash folder on the same volume, and records metadata for restore. */
  async moveToTrash(entries: FileEntry[], primaryStorageRoot: string, onProgress?: ProgressListener): Promise<void> {
    const trashDir = FileService.joinPath(primaryStorageRoot, TRASH_DIR_NAME);
    const operationId = beginOperation(labelFor(entries.map((e) => e.path)));
    const subscription = subscribe(operationId, onProgress);
    try {
      const destinationPaths = await FileOperationsNative.moveEntries(
        entries.map((e) => e.path),
        trashDir,
        operationId,
      );
      for (let i = 0; i < destinationPaths.length; i++) {
        const original = entries[i];
        if (!original) continue;
        await RecycleBinDao.add({
          originalPath: original.path,
          trashPath: destinationPaths[i],
          name: original.name,
          isDirectory: original.isDirectory,
          size: original.size,
        });
      }
    } finally {
      subscription.remove();
    }
  },

  async restoreFromTrash(trashPath: string, originalPath: string): Promise<void> {
    const destDir = FileService.parentPath(originalPath);
    const operationId = beginOperation(trashPath.split('/').pop() ?? trashPath);
    await FileOperationsNative.moveEntries([trashPath], destDir, operationId);
  },
};
