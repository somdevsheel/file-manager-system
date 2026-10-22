import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let dbPromise: Promise<SQLiteDatabase> | null = null;

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

async function openAndMigrate(): Promise<SQLiteDatabase> {
  const db = await SQLite.openDatabase({ name: 'filemanager.db', location: 'default' });
  for (const statement of SCHEMA_STATEMENTS) {
    await db.executeSql(statement);
  }
  return db;
}

/** Caches the in-flight promise, not the handle: concurrent first callers (e.g. several screens
 *  loading at startup) must all wait for the schema to exist, rather than one of them getting the
 *  handle before CREATE TABLE has run and failing with "no such table". */
export function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}
