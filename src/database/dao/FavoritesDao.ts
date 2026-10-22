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

  /** Removes the entry at `path` and, if it was a folder, every favorite inside it. */
  async removeTree(path: string): Promise<void> {
    const db = await getDatabase();
    const prefix = `${path}/`;
    await db.executeSql('DELETE FROM favorites WHERE path = ? OR substr(path, 1, ?) = ?', [path, prefix.length, prefix]);
  },

  /** Rewrites favorites after a rename/move so they keep pointing at the same files. */
  async renameTree(oldPath: string, newPath: string): Promise<void> {
    const db = await getDatabase();
    const prefix = `${oldPath}/`;
    await db.executeSql(
      `UPDATE OR REPLACE favorites SET
         path = CASE WHEN path = ? THEN ? ELSE ? || substr(path, ?) END,
         name = CASE WHEN path = ? THEN ? ELSE name END
       WHERE path = ? OR substr(path, 1, ?) = ?`,
      [oldPath, newPath, newPath, oldPath.length + 1, oldPath, newPath.split('/').pop() ?? newPath, oldPath, prefix.length, prefix],
    );
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
