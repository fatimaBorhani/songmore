// تست ارتقای دیتابیس قدیمی واژه‌یاب: حدس‌های قبلی (۵ حرفی) بعد از اضافه شدن ستون length سالم می‌مونن
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'

test('جدول قدیمی word_guesses ستون length می‌گیره و حدس‌های قبلی می‌شن ۵ حرفی', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'songmore-migration-word-'))
  const dbPath = path.join(dir, 'old.db')

  const old = new Database(dbPath)
  old.exec(`CREATE TABLE word_guesses (
    player_key TEXT NOT NULL, date TEXT NOT NULL, guess_number INTEGER NOT NULL,
    word TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (player_key, date, guess_number))`)
  old.prepare("INSERT INTO word_guesses VALUES ('s1', '2026-01-01', 1, 'پرنده', 5)").run()
  old.close()

  process.env.DB_PATH = dbPath
  const { db } = await import('../../core/db.js')

  const columns = db.prepare('PRAGMA table_info(word_guesses)').all().map((c) => c.name)
  assert.ok(columns.includes('length'))
  const row = db.prepare("SELECT word, length FROM word_guesses WHERE player_key = 's1'").get()
  assert.deepEqual({ ...row }, { word: 'پرنده', length: 5 })
  // حالا برای همون روز و بازیکن، حدس ۳ حرفی هم می‌تونه شماره‌ی ۱ داشته باشه
  db.prepare("INSERT INTO word_guesses (player_key, date, length, guess_number, word, created_at) VALUES ('s1', '2026-01-01', 3, 1, 'دست', 6)").run()
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM word_guesses WHERE player_key = 's1'").get().n, 2)

  db.close()
  fs.rmSync(dir, { recursive: true, force: true })
})
