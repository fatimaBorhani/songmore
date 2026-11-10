// تست ارتقای دیتابیس قدیمی واژه‌یاب: جدول ستون length می‌گیره و حدس‌های بازی قدیمی (با جواب ثابت) پاک می‌شن
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'

test('جدول قدیمی word_guesses ستون length می‌گیره و حدس‌های بازی قدیمی توی بازی جدید پیدا نمی‌شن', async () => {
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
  // حدس‌های بازی قدیمی نباید توی بازی ۵ حرفیِ امروز دیده بشن
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM word_guesses').get().n, 0)
  // حالا برای یه روز و بازیکن، هر طول می‌تونه حدس شماره‌ی ۱ داشته باشه
  const insert = db.prepare('INSERT INTO word_guesses (player_key, date, length, guess_number, word, created_at) VALUES (?, ?, ?, ?, ?, ?)')
  insert.run('s1', '2026-01-01', 3, 1, 'دست', 6)
  insert.run('s1', '2026-01-01', 4, 1, 'کتاب', 7)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM word_guesses WHERE player_key = 's1'").get().n, 2)

  db.close()
  fs.rmSync(dir, { recursive: true, force: true })
})
