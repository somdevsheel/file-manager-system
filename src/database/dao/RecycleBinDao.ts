import { getDatabase } from '@database/db';
import { RecycleBinEntry } from '@app-types/file';
import { generateId } from '@utils/id';

export const RecycleBinDao = {
  async getAll(): Promise<RecycleBinEntry[]> {
    const db = await getDatabase();
    const [result] = await db.executeSql('SELECT * FROM recycle_bin ORDER BY deletedAt DESC');
    const rows: RecycleBinEntry[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({ ...row, isDirectory: !!row.isDirectory });
    }
    return rows;
  },

  async add(entry: Omit<RecycleBinEntry, 'id' | 'deletedAt'>): Promise<RecycleBinEntry> {
    const db = await getDatabase();
    const full: RecycleBinEntry = { ...entry, id: generateId('trash'), deletedAt: Date.now() };
    await db.executeSql(
      `INSERT INTO recycle_bin (id, originalPath, trashPath, name, isDirectory, size, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full.id, full.originalPath, full.trashPath, full.name, full.isDirectory ? 1 : 0, full.size, full.deletedAt],
    );
    return full;
  },

  async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM recycle_bin WHERE id = ?', [id]);
  },

  async getExpired(retentionDays: number): Promise<RecycleBinEntry[]> {
    const db = await getDatabase();
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const [result] = await db.executeSql('SELECT * FROM recycle_bin WHERE deletedAt < ?', [cutoff]);
    const rows: RecycleBinEntry[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      rows.push({ ...row, isDirectory: !!row.isDirectory });
    }
    return rows;
  },

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM recycle_bin');
  },
};
