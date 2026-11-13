// تست آمار واژه‌یاب برای صفحه‌ی حساب: بازی تموم‌شده، برد، پیدا شدن با ادامه دادن، توزیع حدس‌ها، رکورد و طول‌ها
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { getWordStats } = await import('../../games/word/playerStats.js')

let server
let baseUrl
before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

const PLAYER = 'stats-player'
const addDaily = (date, length, word) => db.prepare('INSERT INTO word_daily (date, length, word) VALUES (?, ?, ?)').run(date, length, word)
// حدس‌های پشت‌سرهم یه کلمه
function addGuesses(player, date, length, words) {
  const insert = db.prepare('INSERT INTO word_guesses (player_key, date, length, guess_number, word, created_at) VALUES (?, ?, ?, ?, ?, ?)')
  words.forEach((w, i) => insert.run(player, date, length, i + 1, w, Date.now()))
}
const giveUp = (player, date, length) => db.prepare('INSERT INTO word_gaveup (player_key, date, length, created_at) VALUES (?, ?, ?, ?)').run(player, date, length, Date.now())
const wrong = (n, w = 'برف') => Array(n).fill(w)

test('آمار واژه‌یاب: برد، باخت، پیدا شدن با ادامه، توزیع حدس‌ها، رکورد و طول‌ها', () => {
  for (const d of ['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05']) addDaily(d, 3, 'دست')
  for (const d of ['2026-02-01', '2026-02-02']) addDaily(d, 4, 'کتاب')

  // ۱ بهمن: ۳ حرفی برد با ۲ حدس، ۴ حرفی باخت (۶ حدس غلط و «جواب رو ببینم»)
  addGuesses(PLAYER, '2026-02-01', 3, ['برف', 'دست'])
  addGuesses(PLAYER, '2026-02-01', 4, wrong(6, 'خانه'))
  giveUp(PLAYER, '2026-02-01', 4)
  // روز بعد: ۳ حرفی با ادامه دادن (حدس هشتم) پیدا شد؛ ۴ حرفی با ۱ حدس برد
  addGuesses(PLAYER, '2026-02-02', 3, [...wrong(7), 'دست'])
  addGuesses(PLAYER, '2026-02-02', 4, ['کتاب'])
  // روز سوم: فقط یه کلمه و باخت (رکورد صفر می‌شه)
  addGuesses(PLAYER, '2026-02-03', 3, wrong(6))
  giveUp(PLAYER, '2026-02-03', 3)
  // روز چهارم: برد با ۳ حدس
  addGuesses(PLAYER, '2026-02-04', 3, [...wrong(2), 'دست'])
  // روز پنجم: ۶ حدس غلط ولی هنوز نه پیدا شده نه «جواب رو ببینم» (تموم‌نشده، حساب نمی‌شه)
  addGuesses(PLAYER, '2026-02-05', 3, wrong(6))
  // حدس برای روزی که کلمه‌ای ثبت نشده، و بازیکن دیگه: هیچ‌کدوم حساب نمی‌شن
  addGuesses(PLAYER, '2026-03-01', 3, ['دست'])
  addGuesses('somebody-else', '2026-02-01', 3, ['دست'])

  const stats = getWordStats(PLAYER)
  assert.equal(stats.played, 6)
  assert.equal(stats.wins, 3)
  assert.equal(stats.lateSolved, 1)
  assert.deepEqual(stats.distribution, [1, 1, 1, 0, 0, 0])
  assert.equal(stats.averageGuesses, 2)
  assert.deepEqual(stats.byLength, [
    { length: 3, played: 4, wins: 2 },
    { length: 4, played: 2, wins: 1 },
  ])
  assert.equal(stats.maxStreak, 2)
  assert.equal(stats.currentStreak, 1)
})

test('بازیکنی که هیچی بازی نکرده: همه‌چیز صفر', () => {
  const stats = getWordStats('nobody')
  assert.deepEqual(stats, { played: 0, wins: 0, lateSolved: 0, currentStreak: 0, maxStreak: 0, averageGuesses: 0, distribution: [0, 0, 0, 0, 0, 0], byLength: [] })
})

test('API آمار: مهمان 401، کاربر واردشده آمار خودش رو می‌گیره', async () => {
  const guest = await fetch(`${baseUrl}/api/word/stats`)
  assert.equal(guest.status, 401)
  const cookie = guest.headers.get('set-cookie').split(';')[0]
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'word_stats', password: 'pass-1234' }),
  })
  assert.equal(signup.status, 201)
  const authCookie = signup.headers.getSetCookie().find((c) => c.startsWith('songmore_auth=')).split(';')[0]
  const res = await fetch(`${baseUrl}/api/word/stats`, { headers: { Cookie: `${cookie}; ${authCookie}` } })
  assert.equal(res.status, 200)
  const stats = await res.json()
  assert.equal(stats.played, 0)
  assert.equal(stats.distribution.length, 6)
})
