import { SearchService } from '@services/SearchService';
import { FileEntry } from '@app-types/file';

export const LARGE_FILE_THRESHOLDS = [
  { label: '100 MB+', bytes: 100 * 1024 * 1024 },
  { label: '500 MB+', bytes: 500 * 1024 * 1024 },
  { label: '1 GB+', bytes: 1024 * 1024 * 1024 },
  { label: '5 GB+', bytes: 5 * 1024 * 1024 * 1024 },
] as const;

export const LargeFileService = {
  async find(rootPath: string, minSizeBytes: number): Promise<FileEntry[]> {
    const results = await SearchService.search(rootPath, { query: '', minSize: minSizeBytes }, 5000);
    return results.filter((r) => !r.isDirectory).sort((a, b) => b.size - a.size);
  },
};
