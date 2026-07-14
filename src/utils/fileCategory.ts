import { FileCategory } from '@app-types/file';

/**
 * Extension -> category mapping. Mirrors FileCategoryUtils.kt on the native side.
 * Kept in sync manually since native modules and JS run in separate runtimes.
 */
const CATEGORY_EXTENSIONS: Record<Exclude<FileCategory, FileCategory.Folder | FileCategory.Unknown>, string[]> = {
  [FileCategory.Image]: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'svg', 'tiff', 'tif', 'ico'],
  [FileCategory.Video]: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', '3gpp', 'mpeg', 'mpg', 'ts'],
  [FileCategory.Audio]: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'amr', 'mid', 'midi'],
  [FileCategory.Pdf]: ['pdf'],
  [FileCategory.Word]: ['doc', 'docx', 'dot', 'dotx', 'odt'],
  [FileCategory.Excel]: ['xls', 'xlsx', 'xlsm', 'csv', 'ods'],
  [FileCategory.PowerPoint]: ['ppt', 'pptx', 'pps', 'ppsx', 'odp'],
  [FileCategory.Zip]: ['zip'],
  [FileCategory.Rar]: ['rar'],
  [FileCategory.SevenZip]: ['7z'],
  [FileCategory.Apk]: ['apk', 'xapk', 'apks'],
  [FileCategory.Json]: ['json'],
  [FileCategory.Xml]: ['xml', 'html', 'htm'],
  [FileCategory.Code]: [
    'java', 'kt', 'kts', 'js', 'jsx', 'ts', 'tsx', 'py', 'c', 'cpp', 'cc', 'h', 'hpp',
    'cs', 'go', 'rs', 'rb', 'php', 'swift', 'sh', 'gradle', 'dart', 'lua', 'sql', 'pl', 'r',
  ],
  [FileCategory.Text]: ['txt', 'md', 'log', 'ini', 'cfg', 'conf', 'yaml', 'yml', 'rtf'],
  [FileCategory.Document]: ['epub', 'djvu', 'pages', 'mobi', 'azw', 'azw3'],
};

const EXTENSION_TO_CATEGORY = new Map<string, FileCategory>();
for (const [category, extensions] of Object.entries(CATEGORY_EXTENSIONS)) {
  for (const ext of extensions) {
    EXTENSION_TO_CATEGORY.set(ext, category as FileCategory);
  }
}

export function categoryForExtension(extension: string, isDirectory: boolean): FileCategory {
  if (isDirectory) return FileCategory.Folder;
  return EXTENSION_TO_CATEGORY.get(extension.toLowerCase()) ?? FileCategory.Unknown;
}

export function extensionsForCategory(category: FileCategory): string[] {
  return (CATEGORY_EXTENSIONS as Record<string, string[]>)[category] ?? [];
}

export const CATEGORY_LABELS: Record<FileCategory, string> = {
  [FileCategory.Image]: 'Images',
  [FileCategory.Video]: 'Videos',
  [FileCategory.Audio]: 'Music',
  [FileCategory.Document]: 'Documents',
  [FileCategory.Pdf]: 'PDF',
  [FileCategory.Word]: 'Word',
  [FileCategory.Excel]: 'Excel',
  [FileCategory.PowerPoint]: 'PowerPoint',
  [FileCategory.Zip]: 'ZIP Archives',
  [FileCategory.Rar]: 'RAR Archives',
  [FileCategory.SevenZip]: '7Z Archives',
  [FileCategory.Apk]: 'APK Files',
  [FileCategory.Text]: 'Text Files',
  [FileCategory.Json]: 'JSON',
  [FileCategory.Xml]: 'XML / HTML',
  [FileCategory.Code]: 'Code',
  [FileCategory.Folder]: 'Folders',
  [FileCategory.Unknown]: 'Other',
};

/** MaterialCommunityIcons glyph names */
export const CATEGORY_ICONS: Record<FileCategory, string> = {
  [FileCategory.Image]: 'image-outline',
  [FileCategory.Video]: 'movie-outline',
  [FileCategory.Audio]: 'music-note-outline',
  [FileCategory.Document]: 'file-document-outline',
  [FileCategory.Pdf]: 'file-pdf-box',
  [FileCategory.Word]: 'file-word-outline',
  [FileCategory.Excel]: 'file-excel-outline',
  [FileCategory.PowerPoint]: 'file-powerpoint-outline',
  [FileCategory.Zip]: 'folder-zip-outline',
  [FileCategory.Rar]: 'folder-zip-outline',
  [FileCategory.SevenZip]: 'folder-zip-outline',
  [FileCategory.Apk]: 'android',
  [FileCategory.Text]: 'file-document-outline',
  [FileCategory.Json]: 'code-json',
  [FileCategory.Xml]: 'xml',
  [FileCategory.Code]: 'file-code-outline',
  [FileCategory.Folder]: 'folder-outline',
  [FileCategory.Unknown]: 'file-outline',
};

// FileCategory.Document only covers e-reader formats (epub, mobi, ...) at the classification
// level, so individual files keep their specific Word/Excel/PowerPoint icon everywhere else.
// Views that want a broader "Documents" bucket (e.g. the quick-access tile and its search entry
// point) pull in these related categories too.
export const DOCUMENT_GROUP_CATEGORIES = [
  FileCategory.Document,
  FileCategory.Word,
  FileCategory.Excel,
  FileCategory.PowerPoint,
  FileCategory.Text,
];

export const ARCHIVE_EXTENSIONS = new Set([
  ...CATEGORY_EXTENSIONS[FileCategory.Zip],
  ...CATEGORY_EXTENSIONS[FileCategory.Rar],
  ...CATEGORY_EXTENSIONS[FileCategory.SevenZip],
]);
