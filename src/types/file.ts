export enum FileCategory {
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
  Document = 'document',
  Pdf = 'pdf',
  Word = 'word',
  Excel = 'excel',
  PowerPoint = 'powerpoint',
  Zip = 'zip',
  Rar = 'rar',
  SevenZip = 'sevenZip',
  Apk = 'apk',
  Text = 'text',
  Json = 'json',
  Xml = 'xml',
  Code = 'code',
  Folder = 'folder',
  Unknown = 'unknown',
}

export interface FileEntry {
  /** Absolute filesystem path */
  path: string;
  /** Display name including extension */
  name: string;
  /** Lowercased extension without the dot, e.g. "png" */
  extension: string;
  /** True if this entry is a directory */
  isDirectory: boolean;
  /** Size in bytes. 0 for directories unless computed. */
  size: number;
  /** Last modified time, epoch millis */
  modifiedAt: number;
  /** Best-effort creation time, epoch millis (Android exposes this inconsistently) */
  createdAt: number;
  /** Whether the name starts with a dot / Android "hidden" flag */
  isHidden: boolean;
  /** Whether the current process can write to this entry */
  canWrite: boolean;
  /** Derived content category */
  category: FileCategory;
  /** content:// URI when the entry was resolved via SAF, otherwise undefined */
  uri?: string;
  /** Number of direct children, only populated for directories on demand */
  childCount?: number;
}

export interface StorageVolume {
  id: string;
  label: string;
  path: string;
  isRemovable: boolean;
  isPrimary: boolean;
  totalBytes: number;
  freeBytes: number;
}

export interface FileOperationProgress {
  operationId: string;
  type: 'copy' | 'move' | 'delete' | 'zip' | 'unzip';
  currentFile: string;
  processedBytes: number;
  totalBytes: number;
  processedCount: number;
  totalCount: number;
  done: boolean;
  cancelled: boolean;
  error?: string;
}

export type SortField = 'name' | 'size' | 'modifiedAt' | 'extension' | 'category';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
}

export type ViewMode = 'list' | 'grid';

export interface SearchFilters {
  query: string;
  extensions?: string[];
  categories?: FileCategory[];
  minSize?: number;
  maxSize?: number;
  modifiedAfter?: number;
  modifiedBefore?: number;
  rootPath?: string;
}

export interface DuplicateGroup {
  hash: string;
  size: number;
  files: FileEntry[];
}

export interface RecycleBinEntry {
  id: string;
  originalPath: string;
  trashPath: string;
  name: string;
  isDirectory: boolean;
  size: number;
  deletedAt: number;
}

export interface FavoriteEntry {
  id: string;
  path: string;
  name: string;
  isDirectory: boolean;
  addedAt: number;
}

export interface RecentFileEntry {
  id: string;
  path: string;
  name: string;
  openedAt: number;
}

export interface ApkInfo {
  packageName: string;
  versionName: string;
  versionCode: number;
  appName: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  permissions: string[];
  iconBase64?: string;
  isInstalled: boolean;
  installedVersionName?: string;
}

export interface FolderStatistics {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  largestFile?: FileEntry;
  oldestFile?: FileEntry;
  newestFile?: FileEntry;
}
