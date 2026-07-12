import { FileSearchNative } from '@native/modules';
import { FileEntry, SearchFilters } from '@app-types/file';
import { generateId } from '@utils/id';

const DEFAULT_RESULT_LIMIT = 2000;

export const SearchService = {
  async search(rootPath: string, filters: SearchFilters, resultLimit = DEFAULT_RESULT_LIMIT): Promise<FileEntry[]> {
    const searchId = generateId('search');
    return FileSearchNative.search(rootPath, filters as unknown as Record<string, unknown>, searchId, resultLimit);
  },

  cancel(searchId: string): void {
    FileSearchNative.cancelSearch(searchId);
  },
};
