// تست آمار «جوربندی» برای صفحه‌ی حساب: پیدا کردن، تسلیم، بازی نیمه‌تموم، راهنماها و روزهای پشت‌سرهم
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
// بدون vectors.bin: آمار باید باز هم کار کنه
process.env.CLUE_WORDS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'clue-empty-'))

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { getClueStats } = await import('../../games/clue/playerStats.js')

let server
let baseUrl
before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

const PLAYER = 'clue-stats'

// یه روز بازی: words = حدس‌ها به ترتیب؛ کلمه‌ای که با * شروع بشه راهنماست
function addDay(player, date, answer, words, { gaveUp = false } = {}) {
  db.prepare('INSERT OR IGNORE INTO clue_daily (date, word) VALUES (?, ?)').run(date, answer)
  const insert = db.prepare(
    'INSERT INTO clue_guesses (player_key, date, guess_number, word, hint, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  words.forEach((w, i) => insert.run(player, date, i + 1, w.replace('*', ''), w.startsWith('*') ? 1 : 0, Date.now()))
  if (gaveUp) db.prepare('INSERT INTO clue_gaveup (player_key, date, created_at) VALUES (?, ?, ?)').run(player, date, Date.now())
}

test('آمار: پیدا کردن، تسلیم، نیمه‌تموم و روزهای پشت‌سرهم', () => {
  addDay(PLAYER, '2026-03-01', 'کتاب', ['سیب', 'رمان', 'کتاب']) // ۳ حدس
  addDay(PLAYER, '2026-03-02', 'دریا', ['کوه', '*ساحل', 'موج', 'آب', 'دریا']) // ۴ حدس + ۱ راهنما
  addDay(PLAYER, '2026-03-03', 'کوه', ['سیب'], { gaveUp: true }) // تسلیم
  addDay(PLAYER, '2026-03-04', 'سیب', ['سیب']) // ۱ حدس
  addDay(PLAYER, '2026-03-05', 'ماشین', ['کتاب', 'دریا']) // نیمه‌تموم: حساب نمی‌شه
  addDay(PLAYER, '2026-03-06', 'رمان', ['*رمان'], { gaveUp: true }) // راهنما خود جواب نیست، ولی اینجا تسلیم شده
  addDay('somebody-else', '2026-03-01', 'کتاب', ['کتاب'])

  const stats = getClueStats(PLAYER, '2026-03-05')
  assert.deepEqual(stats, {
    played: 5,
    wins: 3,
    gaveUps: 2,
    averageGuesses: 2.7, // (۳ + ۴ + ۱) / ۳
    bestGuesses: 1,
    totalHints: 2,
    noHintWins: 2,
    currentStreak: 1, // روز ۴ پیدا شد؛ امروز روز ۵ است
    maxStreak: 2, // ۱ و ۲
  })
  // دو روز بعد از آخرین پیدا کردن رکورد فعلی صفره
  assert.equal(getClueStats(PLAYER, '2026-03-07').currentStreak, 0)
})

test('آمار بازیکن تازه همه صفره', () => {
  assert.deepEqual(getClueStats('nobody', '2026-03-05'), {
    played: 0, wins: 0, gaveUps: 0, averageGuesses: 0, bestGuesses: 0, totalHints: 0, noHintWins: 0, currentStreak: 0, maxStreak: 0,
  })
})

test('GET /api/clue/stats: مهمان 401، کاربر واردشده آمار می‌گیره (حتی بدون vectors.bin)', async () => {
  assert.equal((await fetch(`${baseUrl}/api/clue/stats`)).status, 401)
  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'cluestats', password: 'pass-1234' }),
  })
  const auth = res.headers.getSetCookie().find((c) => c.startsWith('songmore_auth=')).split(';')[0]
  const stats = await fetch(`${baseUrl}/api/clue/stats`, { headers: { Cookie: auth } })
  assert.equal(stats.status, 200)
  assert.equal((await stats.json()).played, 0)
})
