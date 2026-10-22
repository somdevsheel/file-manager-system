import { getDatabase } from '@database/db';
import { RecentFileEntry } from '@app-types/file';
import { generateId } from '@utils/id';

const MAX_RECENT_ENTRIES = 200;

export const RecentFilesDao = {
  async getAll(limit = 50): Promise<RecentFileEntry[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM recent_files ORDER BY openedAt DESC LIMIT ?', [limit]);
    const rows: RecentFileEntry[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(result.rows.item(i));
    }
    return rows;
  },

  async record(path: string, name: string): Promise<void> {
    const db = await getDatabase();
    const existing = await db.executeSql('SELECT id FROM recent_files WHERE path = ?', [path]);
    if (existing[0].rows.length > 0) {
      await db.executeSql('UPDATE recent_files SET openedAt = ? WHERE path = ?', [Date.now(), path]);
    } else {
      await db.executeSql(
        'INSERT INTO recent_files (id, path, name, openedAt) VALUES (?, ?, ?, ?)',
        [generateId('recent'), path, name, Date.now()],
      );
    }
    // Trim to keep the table bounded
    await db.executeSql(
      `DELETE FROM recent_files WHERE id NOT IN (
        SELECT id FROM recent_files ORDER BY openedAt DESC LIMIT ?
      )`,
      [MAX_RECENT_ENTRIES],
    );
  },

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM recent_files');
  },

  async removeByPath(path: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM recent_files WHERE path = ?', [path]);
  },

  /** Removes the entry at `path` and, if it was a folder, every recent file inside it. */
  async removeTree(path: string): Promise<void> {
    const db = await getDatabase();
    const prefix = `${path}/`;
    await db.executeSql('DELETE FROM recent_files WHERE path = ? OR substr(path, 1, ?) = ?', [path, prefix.length, prefix]);
  },

  /** Rewrites recent entries after a rename/move so they keep pointing at the same files. */
  async renameTree(oldPath: string, newPath: string): Promise<void> {
    const db = await getDatabase();
    const prefix = `${oldPath}/`;
    await db.executeSql(
      `UPDATE OR REPLACE recent_files SET
         path = CASE WHEN path = ? THEN ? ELSE ? || substr(path, ?) END,
         name = CASE WHEN path = ? THEN ? ELSE name END
       WHERE path = ? OR substr(path, 1, ?) = ?`,
      [oldPath, newPath, newPath, oldPath.length + 1, oldPath, newPath.split('/').pop() ?? newPath, oldPath, prefix.length, prefix],
    );
  },
};
