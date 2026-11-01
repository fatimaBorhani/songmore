// اتصال به دیتابیس SQLite و تعریف جدول‌ها (بدون ORM)
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'game.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    persian TEXT,
    aliases TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    alt_title TEXT,
    credit TEXT NOT NULL,
    file_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS song_artists (
    song_id TEXT NOT NULL REFERENCES songs(id),
    artist_id TEXT NOT NULL REFERENCES artists(id),
    role TEXT NOT NULL CHECK (role IN ('main', 'featured')),
    PRIMARY KEY (song_id, artist_id)
  );

  CREATE TABLE IF NOT EXISTS clips (
    song_id TEXT NOT NULL REFERENCES songs(id),
    stage TEXT NOT NULL,
    file_name TEXT NOT NULL,
    PRIMARY KEY (song_id, stage)
  );

  CREATE TABLE IF NOT EXISTS daily_song (
    date TEXT PRIMARY KEY,
    song_id TEXT NOT NULL REFERENCES songs(id)
  );

  CREATE TABLE IF NOT EXISTS guesses (
    session_id TEXT NOT NULL,
    date TEXT NOT NULL,
    guess_number INTEGER NOT NULL,
    guess_text TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('correct', 'present', 'incorrect', 'skipped')),
    PRIMARY KEY (session_id, date, guess_number)
  );
`)
