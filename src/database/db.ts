import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let dbInstance: SQLiteDatabase | null = null;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY NOT NULL,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    isDirectory INTEGER NOT NULL,
    addedAt INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS recent_files (
    id TEXT PRIMARY KEY NOT NULL,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    openedAt INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS recycle_bin (
    id TEXT PRIMARY KEY NOT NULL,
    originalPath TEXT NOT NULL,
    trashPath TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    isDirectory INTEGER NOT NULL,
    size INTEGER NOT NULL,
    deletedAt INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS locked_files (
    id TEXT PRIMARY KEY NOT NULL,
    originalPath TEXT NOT NULL,
    vaultPath TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    isDirectory INTEGER NOT NULL,
    size INTEGER NOT NULL,
    lockedAt INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_recent_openedAt ON recent_files (openedAt DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_recycle_deletedAt ON recycle_bin (deletedAt DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_locked_lockedAt ON locked_files (lockedAt DESC);`,
];

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabase({ name: 'filemanager.db', location: 'default' });
  for (const statement of SCHEMA_STATEMENTS) {
    await dbInstance.executeSql(statement);
  }
  return dbInstance;
}
