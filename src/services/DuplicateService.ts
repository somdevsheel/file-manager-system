import { DuplicateFinderNative, duplicateFinderEmitter } from '@native/modules';
import { DuplicateGroup } from '@app-types/file';
import { generateId } from '@utils/id';

export interface DuplicateScanProgress {
  scanId: string;
  scanned: number;
  total: number;
  done: boolean;
}

export const DuplicateService = {
  newScanId(): string {
    return generateId('dupscan');
  },

  /** Pass a `scanId` (from newScanId) to be able to cancel() the scan, e.g. when leaving the screen. */
  async findDuplicates(
    rootPath: string,
    onProgress?: (progress: DuplicateScanProgress) => void,
    scanId = generateId('dupscan'),
  ): Promise<DuplicateGroup[]> {
    const subscription = onProgress
      ? duplicateFinderEmitter.addListener('DuplicateScanProgress', (event: DuplicateScanProgress) => {
          if (event.scanId === scanId) onProgress(event);
        })
      : null;
    try {
      return await DuplicateFinderNative.findDuplicates(rootPath, scanId);
    } finally {
      subscription?.remove();
    }
  },

  cancel(scanId: string): void {
    DuplicateFinderNative.cancelScan(scanId);
  },

  keepNewest(group: DuplicateGroup): string[] {
    const sorted = [...group.files].sort((a, b) => b.modifiedAt - a.modifiedAt);
    return sorted.slice(1).map((f) => f.path);
  },

  keepOldest(group: DuplicateGroup): string[] {
    const sorted = [...group.files].sort((a, b) => a.modifiedAt - b.modifiedAt);
    return sorted.slice(1).map((f) => f.path);
  },
};
