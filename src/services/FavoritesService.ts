import { FavoritesDao } from '@database/dao/FavoritesDao';
import { FavoriteEntry } from '@app-types/file';

export const FavoritesService = {
  getAll(): Promise<FavoriteEntry[]> {
    return FavoritesDao.getAll();
  },
  isFavorite(path: string): Promise<boolean> {
    return FavoritesDao.isFavorite(path);
  },
  toggle(path: string, name: string, isDirectory: boolean): Promise<boolean> {
    return FavoritesDao.toggle(path, name, isDirectory);
  },
  remove(path: string): Promise<void> {
    return FavoritesDao.removeByPath(path);
  },
};
