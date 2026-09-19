import { getDatabase } from '@database/db';
import { LockedFileEntry } from '@app-types/file';
import { generateId } from '@utils/id';

export const LockedFilesDao = {
  async getAll(): Promise<LockedFileEntry[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM locked_files ORDER BY lockedAt DESC');
    const rows: LockedFileEntry[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({ ...row, isDirectory: !!row.isDirectory });
    }
    return rows;
  },

  async add(entry: Omit<LockedFileEntry, 'id' | 'lockedAt'>): Promise<LockedFileEntry> {
    const db = await getDatabase();
    const full: LockedFileEntry = { ...entry, id: generateId('locked'), lockedAt: Date.now() };
    await db.executeSql(
      `INSERT INTO locked_files (id, originalPath, vaultPath, name, isDirectory, size, lockedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full.id, full.originalPath, full.vaultPath, full.name, full.isDirectory ? 1 : 0, full.size, full.lockedAt],
    );
    return full;
  },

  async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM locked_files WHERE id = ?', [id]);
  },

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM locked_files');
  },
};
