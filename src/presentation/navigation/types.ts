import { FileCategory } from '@app-types/file';

export type RootStackParamList = {
  Main: undefined;
  Browser: { path: string; title?: string };
  Search: { rootPath: string; initialCategories?: FileCategory[] };
  Category: { category: FileCategory; rootPath: string };
  Favorites: undefined;
  Recent: undefined;
  StorageAnalyzer: { rootPath: string };
  DuplicateFinder: { rootPath: string };
  LargeFileFinder: { rootPath: string };
  RecycleBin: undefined;
  Locked: undefined;
  ZipManager: { archivePath: string };
  ImageViewer: { path: string; siblingPaths?: string[] };
  VideoPlayer: { path: string };
  AudioPlayer: { path: string; playlist?: string[] };
  PdfViewer: { path: string };
  TextViewer: { path: string };
  ApkDetails: { path: string };
  FileDetails: { path: string };
  FolderStatistics: { path: string };
  Settings: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  BrowserTab: undefined;
  CategoriesTab: undefined;
  SettingsTab: undefined;
};
