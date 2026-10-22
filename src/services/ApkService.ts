import { ApkManagerNative } from '@native/modules';
import { ApkInfo } from '@app-types/file';

export const ApkService = {
  async getInfo(path: string): Promise<ApkInfo> {
    return ApkManagerNative.getApkInfo(path);
  },

  async install(path: string): Promise<void> {
    await ApkManagerNative.installApk(path);
  },

  async isInstalled(packageName: string): Promise<boolean> {
    return ApkManagerNative.isPackageInstalled(packageName);
  },
};
