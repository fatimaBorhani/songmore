// تست ارتقای دیتابیس قدیمی: جدول guesses بدون ستون created_at باید خودکار ستون بگیره
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'

test('دیتابیس قدیمی ستون created_at می‌گیره و حدس‌های قبلی سالم می‌مونن', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'songmore-migration-'))
  const dbPath = path.join(dir, 'old.db')

  // یه دیتابیس با ساختار قدیمی (بدون created_at) و یه حدس
  const old = new Database(dbPath)
  old.exec(`CREATE TABLE guesses (
    session_id TEXT NOT NULL, date TEXT NOT NULL, guess_number INTEGER NOT NULL,
    guess_text TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY (session_id, date, guess_number))`)
  old.prepare("INSERT INTO guesses VALUES ('s1', '2026-01-01', 1, 'x', 'correct')").run()
  old.close()

  process.env.DB_PATH = dbPath
  const { db } = await import('../../core/db.js')

  const columns = db.prepare('PRAGMA table_info(guesses)').all().map((c) => c.name)
  assert.ok(columns.includes('created_at'))
  const row = db.prepare("SELECT result, created_at FROM guesses WHERE session_id = 's1'").get()
  assert.equal(row.result, 'correct')
  assert.equal(row.created_at, null)

  db.close()
  fs.rmSync(dir, { recursive: true, force: true })
})
