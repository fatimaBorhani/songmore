// اتصال به دیتابیس SQLite و تعریف جدول‌ها (بدون ORM)
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// پیش‌فرض: server/game.db (یه پوشه بالاتر از core/)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'game.db')

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
    created_at INTEGER,
    PRIMARY KEY (session_id, date, guess_number)
  );

  -- حساب‌های کاربری؛ نام کاربری بدون توجه به حروف بزرگ و کوچیک یکتاست
  -- رمز هیچ‌وقت خودش ذخیره نمی‌شه، فقط هش scrypt با salt تصادفی
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- نشست‌های ورود؛ خود توکن فقط توی کوکی کاربره، اینجا فقط هش SHA-256 ش
  CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  -- حدس‌های بازی واژه‌یاب؛ رنگ حرف‌ها ذخیره نمی‌شه و هر بار از روی کلمه‌ی جواب حساب می‌شه
  CREATE TABLE IF NOT EXISTS word_guesses (
    player_key TEXT NOT NULL,
    date TEXT NOT NULL,
    guess_number INTEGER NOT NULL,
    word TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (player_key, date, guess_number)
  );
`)

// ارتقای دیتابیس‌های قدیمی: اگه جدول guesses از قبل بوده و ستون created_at نداره، اضافه‌ش کن
// (CREATE TABLE IF NOT EXISTS به جدولی که از قبل هست ستون اضافه نمی‌کنه)
const guessColumns = db.prepare('PRAGMA table_info(guesses)').all().map((c) => c.name)
if (!guessColumns.includes('created_at')) {
  db.exec('ALTER TABLE guesses ADD COLUMN created_at INTEGER')
}
