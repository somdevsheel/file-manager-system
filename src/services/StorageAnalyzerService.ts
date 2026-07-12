import { StorageAnalyzerNative } from '@native/modules';
import { FileEntry } from '@app-types/file';

export interface CategoryBreakdownEntry {
  category: string;
  size: number;
  count: number;
}

export interface TopLevelFolderEntry {
  path: string;
  name: string;
  size: number;
}

export interface StorageAnalysis {
  categoryBreakdown: CategoryBreakdownEntry[];
  topLevelFolders: TopLevelFolderEntry[];
  largestFiles: FileEntry[];
}

export const StorageAnalyzerService = {
  async analyze(rootPath: string, largestFilesLimit = 100): Promise<StorageAnalysis> {
    return StorageAnalyzerNative.analyzeStorage(rootPath, largestFilesLimit);
  },
};
