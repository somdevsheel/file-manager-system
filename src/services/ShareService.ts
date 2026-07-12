import { FileShareNative } from '@native/modules';

export const ShareService = {
  async shareFiles(paths: string[]): Promise<boolean> {
    return FileShareNative.shareFiles(paths);
  },

  async openFile(path: string): Promise<boolean> {
    return FileShareNative.openFile(path);
  },

  async getContentUri(path: string): Promise<string> {
    return FileShareNative.getContentUri(path);
  },
};
