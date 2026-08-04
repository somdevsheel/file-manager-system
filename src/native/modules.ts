import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

function requireModule<T>(name: string): T {
  const mod = NativeModules[name];
  if (!mod && Platform.OS === 'android') {
    throw new Error(
      `Native module "${name}" is not linked. Did you rebuild the Android app after pulling native changes?`,
    );
  }
  return mod as T;
}

export interface FileSystemNative {
  hasAllFilesAccess(): Promise<boolean>;
  requestAllFilesAccess(): void;
  getStorageVolumes(): Promise<any[]>;
  listDirectory(path: string): Promise<any[]>;
  getFileInfo(path: string): Promise<any>;
  exists(path: string): Promise<boolean>;
  createFolder(path: string): Promise<any>;
  createFile(path: string): Promise<any>;
  rename(oldPath: string, newPath: string): Promise<any>;
  computeFolderStats(path: string): Promise<any>;
  getDirectorySize(path: string): Promise<number>;
}

export interface FileOperationsNative {
  cancelOperation(operationId: string): void;
  copyEntries(sourcePaths: string[], destDir: string, operationId: string): Promise<string[]>;
  moveEntries(sourcePaths: string[], destDir: string, operationId: string): Promise<string[]>;
  deleteEntries(paths: string[], operationId: string): Promise<boolean>;
  duplicateEntry(path: string): Promise<any>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export interface MediaCategoryNative {
  scanCategory(rootPath: string, category: string, limit: number): Promise<any[]>;
}

export interface FileSearchNative {
  cancelSearch(searchId: string): void;
  search(rootPath: string, filters: Record<string, unknown>, searchId: string, resultLimit: number): Promise<any[]>;
}

export interface DuplicateFinderNative {
  cancelScan(scanId: string): void;
  findDuplicates(rootPath: string, scanId: string): Promise<any[]>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export interface ArchiveManagerNative {
  cancelOperation(operationId: string): void;
  isEncrypted(path: string): Promise<boolean>;
  listArchiveEntries(path: string, password: string | null): Promise<any[]>;
  extractArchive(path: string, destDir: string, password: string | null, operationId: string): Promise<boolean>;
  createArchive(
    sourcePaths: string[],
    destPath: string,
    format: 'zip' | 'sevenZip',
    password: string | null,
    operationId: string,
  ): Promise<boolean>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export interface ApkManagerNative {
  getApkInfo(path: string): Promise<any>;
  installApk(path: string): void;
  isPackageInstalled(packageName: string): Promise<boolean>;
}

export interface FileShareNative {
  shareFiles(paths: string[]): Promise<boolean>;
  openFile(path: string): Promise<boolean>;
  getContentUri(path: string): Promise<string>;
}

export interface StorageAnalyzerNative {
  analyzeStorage(rootPath: string, largestFilesLimit: number): Promise<{
    categoryBreakdown: { category: string; size: number; count: number }[];
    topLevelFolders: { path: string; name: string; size: number }[];
    largestFiles: any[];
  }>;
}

export interface MediaControlNative {
  getBrightness(): Promise<number>;
  setBrightness(value: number): void;
  clearBrightnessOverride(): void;
  getVolume(): Promise<number>;
  setVolume(value: number): void;
}

export const FileSystemNative = requireModule<FileSystemNative>('FileSystem');
export const FileOperationsNative = requireModule<FileOperationsNative>('FileOperations');
export const MediaCategoryNative = requireModule<MediaCategoryNative>('MediaCategory');
export const FileSearchNative = requireModule<FileSearchNative>('FileSearch');
export const DuplicateFinderNative = requireModule<DuplicateFinderNative>('DuplicateFinder');
export const ArchiveManagerNative = requireModule<ArchiveManagerNative>('ArchiveManager');
export const ApkManagerNative = requireModule<ApkManagerNative>('ApkManager');
export const FileShareNative = requireModule<FileShareNative>('FileShare');
export const StorageAnalyzerNative = requireModule<StorageAnalyzerNative>('StorageAnalyzer');
export const MediaControlNative = requireModule<MediaControlNative>('MediaControl');

export const fileOperationsEmitter = new NativeEventEmitter(NativeModules.FileOperations);
export const duplicateFinderEmitter = new NativeEventEmitter(NativeModules.DuplicateFinder);
export const archiveManagerEmitter = new NativeEventEmitter(NativeModules.ArchiveManager);
