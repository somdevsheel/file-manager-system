import { create } from 'zustand';
import { StorageVolume } from '@app-types/file';
import { FileService } from '@services/FileService';

interface StorageState {
  volumes: StorageVolume[];
  loaded: boolean;
  primaryVolume: StorageVolume | null;
  load: () => Promise<void>;
}

export const useStorageStore = create<StorageState>()((set) => ({
  volumes: [],
  loaded: false,
  primaryVolume: null,

  load: async () => {
    const volumes = await FileService.getStorageVolumes();
    set({
      volumes,
      loaded: true,
      primaryVolume: volumes.find((v) => v.isPrimary) ?? volumes[0] ?? null,
    });
  },
}));
