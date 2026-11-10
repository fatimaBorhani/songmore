// اتصال به دیتابیس SQLite و تعریف جدول‌ها (بدون ORM)
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// پیش‌فرض: server/game.db (یه پوشه بالاتر از core/)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'game.db')

// جدول حدس‌های مسابقه‌ای: slot = شماره‌ی آهنگِ اون روز (۱ تا ۳)
const guessesSql = (name) => `CREATE TABLE ${name} (
    session_id TEXT NOT NULL,
    date TEXT NOT NULL,
    guess_number INTEGER NOT NULL,
    guess_text TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('correct', 'present', 'incorrect', 'skipped', 'gaveup')),
    created_at INTEGER,
    slot INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (session_id, date, slot, guess_number)
  )`

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

  -- آهنگ‌های روزانه: هر روز چند آهنگ (slot ۱ تا ۳) که برای همه‌ی بازیکن‌ها یکیه
  CREATE TABLE IF NOT EXISTS daily_songs (
    date TEXT NOT NULL,
    slot INTEGER NOT NULL,
    song_id TEXT NOT NULL REFERENCES songs(id),
    PRIMARY KEY (date, slot)
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

  -- بازی‌های تمرینی حدس آهنگ (نامحدود، بدون امتیاز و لیگ؛ فقط توی فعالیت پروفایل می‌شمارن)
  -- cycle: هر دور، آهنگ‌ها تکرار نمی‌شن؛ وقتی همه‌ی آهنگ‌ها اومدن دور بعد شروع می‌شه
  CREATE TABLE IF NOT EXISTS practice_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_key TEXT NOT NULL,
    song_id TEXT NOT NULL REFERENCES songs(id),
    cycle INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_practice_games_player ON practice_games (player_key, id);

  CREATE TABLE IF NOT EXISTS practice_guesses (
    game_id INTEGER NOT NULL REFERENCES practice_games(id) ON DELETE CASCADE,
    guess_number INTEGER NOT NULL,
    guess_text TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('correct', 'present', 'incorrect', 'skipped', 'gaveup')),
    created_at INTEGER NOT NULL,
    PRIMARY KEY (game_id, guess_number)
  );

  -- بازی حافظه‌ی رنگ: ۵ رنگ هر روز (برای همه یکی، تصادفی و موقع اولین درخواست ساخته می‌شه تا از قبل قابل حدس نباشه)
  CREATE TABLE IF NOT EXISTS color_daily (
    date TEXT NOT NULL,
    round INTEGER NOT NULL,
    h INTEGER NOT NULL,
    s INTEGER NOT NULL,
    b INTEGER NOT NULL,
    PRIMARY KEY (date, round)
  );

  -- رنگی که بازیکن توی هر دور ساخته (HSB)؛ امتیاز ذخیره نمی‌شه و از روی رنگ‌ها حساب می‌شه
  CREATE TABLE IF NOT EXISTS color_guesses (
    player_key TEXT NOT NULL,
    date TEXT NOT NULL,
    round INTEGER NOT NULL,
    h INTEGER NOT NULL,
    s INTEGER NOT NULL,
    b INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (player_key, date, round)
  );

  -- حدس‌های بازی واژه‌یاب؛ رنگ حرف‌ها ذخیره نمی‌شه و هر بار از روی کلمه‌ی جواب حساب می‌شه
  -- length: طول کلمه (۳، ۴ یا ۵)؛ هر روز برای هر طول یه بازی جدا داریم
  CREATE TABLE IF NOT EXISTS word_guesses (
    player_key TEXT NOT NULL,
    date TEXT NOT NULL,
    guess_number INTEGER NOT NULL,
    word TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    length INTEGER NOT NULL DEFAULT 5,
    PRIMARY KEY (player_key, date, length, guess_number)
  );

  -- کلمه‌های روزانه‌ی واژه‌یاب: برای هر تاریخ و هر طول یه کلمه که برای همه یکیه
  CREATE TABLE IF NOT EXISTS word_daily (
    date TEXT NOT NULL,
    length INTEGER NOT NULL,
    word TEXT NOT NULL,
    PRIMARY KEY (date, length)
  );
`)

// جدول حدس‌های مسابقه‌ای (اگه از قبل نباشه). دیتابیس‌های قدیمی پایین‌تر ارتقا پیدا می‌کنن.
if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'guesses'").get()) {
  db.exec(guessesSql('guesses'))
}

// ارتقای دیتابیس‌های قدیمی: اگه جدول guesses از قبل بوده و ستون created_at نداره، اضافه‌ش کن
// (CREATE TABLE IF NOT EXISTS به جدولی که از قبل هست ستون اضافه نمی‌کنه)
const guessColumns = db.prepare('PRAGMA table_info(guesses)').all().map((c) => c.name)
if (!guessColumns.includes('created_at')) {
  db.exec('ALTER TABLE guesses ADD COLUMN created_at INTEGER')
}

// ارتقای دیتابیس‌های قدیمی: نتیجه‌ی «gaveup» (نمایش جواب) به CHECK جدول‌های حدس اضافه شده.
// SQLite CHECK رو نمی‌شه عوض کرد، پس جدول رو با همون ستون‌ها دوباره می‌سازیم و داده‌ها رو کپی می‌کنیم.
for (const table of ['guesses', 'practice_guesses']) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
  if (row && !row.sql.includes("'gaveup'")) {
    const newSql = row.sql
      .replace("'skipped')", "'skipped', 'gaveup')")
      .replace(`CREATE TABLE "${table}"`, `CREATE TABLE ${table}`)
    db.exec(`ALTER TABLE ${table} RENAME TO ${table}_old`)
    db.exec(newSql)
    db.exec(`INSERT INTO ${table} SELECT * FROM ${table}_old`)
    db.exec(`DROP TABLE ${table}_old`)
  }
}

// ارتقای دیتابیس‌های قدیمی: بازی مسابقه‌ای حالا روزی چند آهنگ داره (ستون slot).
// کلید اصلی جدول عوض می‌شه، پس جدول رو دوباره می‌سازیم؛ حدس‌های قبلی می‌شن آهنگ ۱ همون روز.
const guessColumnsNow = db.prepare('PRAGMA table_info(guesses)').all().map((c) => c.name)
if (!guessColumnsNow.includes('slot')) {
  db.exec('ALTER TABLE guesses RENAME TO guesses_old')
  db.exec(guessesSql('guesses'))
  db.exec(`INSERT INTO guesses (session_id, date, guess_number, guess_text, result, created_at, slot)
           SELECT session_id, date, guess_number, guess_text, result, created_at, 1 FROM guesses_old`)
  db.exec('DROP TABLE guesses_old')
}

// ارتقای دیتابیس‌های قدیمی: آهنگ‌های روزانه‌ی جدول قدیمی daily_song (روزی یه آهنگ) می‌شن slot ۱
if (db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'daily_song'").get()) {
  db.exec('INSERT OR IGNORE INTO daily_songs (date, slot, song_id) SELECT date, 1, song_id FROM daily_song')
  db.exec('DROP TABLE daily_song')
}

// ارتقای دیتابیس‌های قدیمی: واژه‌یاب حالا هر روز ۳ بازی (۳، ۴ و ۵ حرفی) داره (ستون length).
// کلید اصلی عوض می‌شه، پس جدول رو دوباره می‌سازیم؛ حدس‌های قبلی (که ۵ حرفی بودن) همون‌طور می‌مونن.
const wordColumns = db.prepare('PRAGMA table_info(word_guesses)').all().map((c) => c.name)
if (!wordColumns.includes('length')) {
  db.exec('ALTER TABLE word_guesses RENAME TO word_guesses_old')
  db.exec(`CREATE TABLE word_guesses (
    player_key TEXT NOT NULL,
    date TEXT NOT NULL,
    guess_number INTEGER NOT NULL,
    word TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    length INTEGER NOT NULL DEFAULT 5,
    PRIMARY KEY (player_key, date, length, guess_number)
  )`)
  db.exec(`INSERT INTO word_guesses (player_key, date, guess_number, word, created_at, length)
           SELECT player_key, date, guess_number, word, created_at, 5 FROM word_guesses_old`)
  db.exec('DROP TABLE word_guesses_old')
}
