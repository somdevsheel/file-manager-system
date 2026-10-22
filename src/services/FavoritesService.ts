import { FavoritesDao } from '@database/dao/FavoritesDao';
import { FavoriteEntry } from '@app-types/file';
import { isInVault } from '@services/LockedFilesService';

export const FavoritesService = {
  getAll(): Promise<FavoriteEntry[]> {
    return FavoritesDao.getAll();
  },
  isFavorite(path: string): Promise<boolean> {
    return FavoritesDao.isFavorite(path);
  },
  toggle(path: string, name: string, isDirectory: boolean): Promise<boolean> {
    if (isInVault(path)) {
      return Promise.reject(new Error("Items in the Locked vault can't be added to favorites"));
    }
    return FavoritesDao.toggle(path, name, isDirectory);
  },
  remove(path: string): Promise<void> {
    return FavoritesDao.removeByPath(path);
  },
};
