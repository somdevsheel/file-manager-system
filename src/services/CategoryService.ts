import { MediaCategoryNative } from '@native/modules';
import { FileCategory, FileEntry } from '@app-types/file';
import { DOCUMENT_GROUP_CATEGORIES } from '@utils/fileCategory';

const DEFAULT_LIMIT = 5000;

export const CategoryService = {
  async scan(rootPath: string, category: FileCategory, limit = DEFAULT_LIMIT): Promise<FileEntry[]> {
    if (category === FileCategory.Document) {
      const results = await Promise.all(
        DOCUMENT_GROUP_CATEGORIES.map((cat) => MediaCategoryNative.scanCategory(rootPath, cat, limit)),
      );
      return results.flat();
    }
    return MediaCategoryNative.scanCategory(rootPath, category, limit);
  },
};
