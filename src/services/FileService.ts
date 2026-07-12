import { FileSystemNative } from '@native/modules';
import { FileEntry, FolderStatistics, SortOption, StorageVolume } from '@app-types/file';

export const FileService = {
  async getStorageVolumes(): Promise<StorageVolume[]> {
    return FileSystemNative.getStorageVolumes();
  },

  async listDirectory(path: string): Promise<FileEntry[]> {
    return FileSystemNative.listDirectory(path);
  },

  async getFileInfo(path: string): Promise<FileEntry> {
    return FileSystemNative.getFileInfo(path);
  },

  async exists(path: string): Promise<boolean> {
    return FileSystemNative.exists(path);
  },

  async createFolder(path: string): Promise<FileEntry> {
    return FileSystemNative.createFolder(path);
  },

  async createFile(path: string): Promise<FileEntry> {
    return FileSystemNative.createFile(path);
  },

  async rename(oldPath: string, newPath: string): Promise<FileEntry> {
    return FileSystemNative.rename(oldPath, newPath);
  },

  async computeFolderStats(path: string): Promise<FolderStatistics> {
    return FileSystemNative.computeFolderStats(path);
  },

  async getDirectorySize(path: string): Promise<number> {
    return FileSystemNative.getDirectorySize(path);
  },

  sortEntries(entries: FileEntry[], sort: SortOption, foldersFirst = true): FileEntry[] {
    const sorted = [...entries].sort((a, b) => {
      if (foldersFirst && a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      let result = 0;
      switch (sort.field) {
        case 'name':
          result = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
          break;
        case 'size':
          result = a.size - b.size;
          break;
        case 'modifiedAt':
          result = a.modifiedAt - b.modifiedAt;
          break;
        case 'extension':
          result = a.extension.localeCompare(b.extension);
          break;
        case 'category':
          result = a.category.localeCompare(b.category);
          break;
      }
      return sort.order === 'asc' ? result : -result;
    });
    return sorted;
  },

  joinPath(...segments: string[]): string {
    return segments
      .map((s, i) => (i === 0 ? s.replace(/\/+$/, '') : s.replace(/^\/+|\/+$/g, '')))
      .filter(Boolean)
      .join('/');
  },

  parentPath(path: string): string {
    const trimmed = path.replace(/\/+$/, '');
    const idx = trimmed.lastIndexOf('/');
    return idx <= 0 ? '/' : trimmed.slice(0, idx);
  },
};
