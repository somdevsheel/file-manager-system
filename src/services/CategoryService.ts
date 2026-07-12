import { MediaCategoryNative } from '@native/modules';
import { FileCategory, FileEntry } from '@app-types/file';

const DEFAULT_LIMIT = 5000;

export const CategoryService = {
  async scan(rootPath: string, category: FileCategory, limit = DEFAULT_LIMIT): Promise<FileEntry[]> {
    return MediaCategoryNative.scanCategory(rootPath, category, limit);
  },
};
