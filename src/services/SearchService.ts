import { FileSearchNative } from '@native/modules';
import { FileEntry, SearchFilters } from '@app-types/file';
import { generateId } from '@utils/id';

const DEFAULT_RESULT_LIMIT = 2000;

export const SearchService = {
  newSearchId(): string {
    return generateId('search');
  },

  /** Pass a `searchId` (from newSearchId) to be able to cancel() the native walk later. */
  async search(
    rootPath: string,
    filters: SearchFilters,
    resultLimit = DEFAULT_RESULT_LIMIT,
    searchId = generateId('search'),
  ): Promise<FileEntry[]> {
    return FileSearchNative.search(rootPath, filters as unknown as Record<string, unknown>, searchId, resultLimit);
  },

  cancel(searchId: string): void {
    FileSearchNative.cancelSearch(searchId);
  },
};
