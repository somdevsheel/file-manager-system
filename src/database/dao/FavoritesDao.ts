import { getDatabase } from '@database/db';
import { FavoriteEntry } from '@app-types/file';
import { generateId } from '@utils/id';

export const FavoritesDao = {
  async getAll(): Promise<FavoriteEntry[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM favorites ORDER BY addedAt DESC');
    const rows: FavoriteEntry[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({ ...row, isDirectory: !!row.isDirectory });
    }
    return rows;
  },

  async isFavorite(path: string): Promise<boolean> {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT id FROM favorites WHERE path = ? LIMIT 1', [path]);
    return result.rows.length > 0;
  },

  async add(path: string, name: string, isDirectory: boolean): Promise<FavoriteEntry> {
    const db = await getDatabase();
    const entry: FavoriteEntry = { id: generateId('fav'), path, name, isDirectory, addedAt: Date.now() };
    await db.executeSql(
      'INSERT OR IGNORE INTO favorites (id, path, name, isDirectory, addedAt) VALUES (?, ?, ?, ?, ?)',
      [entry.id, entry.path, entry.name, entry.isDirectory ? 1 : 0, entry.addedAt],
    );
    return entry;
  },

  async removeByPath(path: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM favorites WHERE path = ?', [path]);
  },

  async toggle(path: string, name: string, isDirectory: boolean): Promise<boolean> {
    const isFav = await FavoritesDao.isFavorite(path);
    if (isFav) {
      await FavoritesDao.removeByPath(path);
      return false;
    }
    await FavoritesDao.add(path, name, isDirectory);
    return true;
  },
};
