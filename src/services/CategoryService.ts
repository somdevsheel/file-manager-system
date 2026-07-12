import { MediaCategoryNative } from '@native/modules';
import { FileCategory, FileEntry } from '@app-types/file';

const DEFAULT_LIMIT = 5000;

// FileCategory.Document only covers e-reader formats (epub, mobi, ...) at the classification
// level, so individual files keep their specific Word/Excel/PowerPoint icon everywhere else in
// the app. The "Documents" quick-access tile is meant as a broader catch-all though, so widen
// just this scan to pull those categories in too, merged into one result set.
const DOCUMENT_GROUP = [FileCategory.Document, FileCategory.Word, FileCategory.Excel, FileCategory.PowerPoint, FileCategory.Text];

export const CategoryService = {
  async scan(rootPath: string, category: FileCategory, limit = DEFAULT_LIMIT): Promise<FileEntry[]> {
    if (category === FileCategory.Document) {
      const results = await Promise.all(
        DOCUMENT_GROUP.map((cat) => MediaCategoryNative.scanCategory(rootPath, cat, limit)),
      );
      return results.flat();
    }
    return MediaCategoryNative.scanCategory(rootPath, category, limit);
  },
};
