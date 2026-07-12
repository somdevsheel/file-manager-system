import { ArchiveManagerNative, archiveManagerEmitter } from '@native/modules';
import { FileEntry, FileOperationProgress } from '@app-types/file';
import { ARCHIVE_EXTENSIONS } from '@utils/fileCategory';
import { generateId } from '@utils/id';
import { useOperationsStore } from '@store/operationsStore';

export interface ArchiveEntryInfo {
  name: string;
  isDirectory: boolean;
  size: number;
  compressedSize: number;
}

type ProgressListener = (progress: FileOperationProgress) => void;

function subscribe(operationId: string, onProgress?: ProgressListener) {
  if (!onProgress) return { remove: () => {} };
  return archiveManagerEmitter.addListener('FileOperationProgress', (event: FileOperationProgress) => {
    if (event.operationId === operationId) onProgress(event);
  });
}

export const ArchiveService = {
  isArchive(entry: FileEntry): boolean {
    return !entry.isDirectory && ARCHIVE_EXTENSIONS.has(entry.extension.toLowerCase());
  },

  async isEncrypted(path: string): Promise<boolean> {
    return ArchiveManagerNative.isEncrypted(path);
  },

  async listEntries(path: string, password?: string): Promise<ArchiveEntryInfo[]> {
    return ArchiveManagerNative.listArchiveEntries(path, password ?? null);
  },

  async extract(path: string, destDir: string, password?: string, onProgress?: ProgressListener): Promise<boolean> {
    const operationId = generateId('extract');
    useOperationsStore.getState().registerLabel(operationId, path.split('/').pop() ?? path);
    const subscription = subscribe(operationId, onProgress);
    try {
      return await ArchiveManagerNative.extractArchive(path, destDir, password ?? null, operationId);
    } finally {
      subscription.remove();
    }
  },

  async create(
    sourcePaths: string[],
    destPath: string,
    format: 'zip' | 'sevenZip',
    password?: string,
    onProgress?: ProgressListener,
  ): Promise<boolean> {
    const operationId = generateId('archive');
    useOperationsStore.getState().registerLabel(operationId, destPath.split('/').pop() ?? destPath);
    const subscription = subscribe(operationId, onProgress);
    try {
      return await ArchiveManagerNative.createArchive(sourcePaths, destPath, format, password ?? null, operationId);
    } finally {
      subscription.remove();
    }
  },

  cancel(operationId: string): void {
    ArchiveManagerNative.cancelOperation(operationId);
  },
};
