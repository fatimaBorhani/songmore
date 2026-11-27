// تست آمار «جورشعر» برای صفحه‌ی حساب: امتیاز، خط‌ها، روزهای تموم‌شده و روزهای پشت‌سرهم
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
const { useLyricsFixture, ANSWER_LINES } = await import('./fixture.js')
useLyricsFixture()

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { getLyricsStats } = await import('../../games/lyrics/playerStats.js')

let server
let baseUrl
before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

const TODAY = '2026-03-10'
const insertDaily = db.prepare('INSERT INTO lyrics_daily (date, slot, puzzle_id) VALUES (?, ?, ?)')
const insertAnswer = db.prepare('INSERT INTO lyrics_answers (player_key, date, slot, line1, line2, created_at) VALUES (?, ?, ?, ?, ?, 0)')

// یه روز: تیکه‌های p1..p3 و جواب‌های داده‌شده (هر جواب = [خط اول، خط دوم])
function day(player, date, answers) {
  ;['p1', 'p2', 'p3'].forEach((id, i) => insertDaily.run(date, i + 1, id))
  answers.forEach(([a, b], i) => insertAnswer.run(player, date, i + 1, a, b))
}

const RIGHT = [ANSWER_LINES[0], ANSWER_LINES[1]] // ۴ امتیاز
const HALF = [ANSWER_LINES[0], 'یه چیز دیگه'] // ۲ امتیاز
const CLOSE = ['ستاره‌ها رو دونه دونه می‌شمرم', 'نمی‌دونم'] // ۱ امتیاز

test('بازیکن بی‌بازی: همه صفر', () => {
  const s = getLyricsStats('nobody', TODAY)
  assert.equal(s.songs, 0)
  assert.equal(s.played, 0)
  assert.equal(s.averageDay, 0)
  assert.equal(s.maxDay, 12)
})

test('امتیاز، خط‌ها، روزهای تموم‌شده و رکورد', () => {
  const p = 'player-a'
  day(p, '2026-03-07', [RIGHT, HALF, CLOSE]) // ۷
  day(p, '2026-03-08', [RIGHT, RIGHT, RIGHT]) // ۱۲
  day(p, '2026-03-09', [HALF]) // نیمه‌تموم: توی روزها حساب نمی‌شه
  day(p, '2026-03-10', [RIGHT, HALF, HALF]) // ۸
  const s = getLyricsStats(p, TODAY)
  assert.equal(s.songs, 10)
  assert.equal(s.played, 3)
  assert.equal(s.totalPoints, 7 + 12 + 2 + 8)
  assert.equal(s.averageDay, 9)
  assert.equal(s.bestDay, 12)
  assert.equal(s.perfectSongs, 5)
  assert.equal(s.okLines + s.closeLines + s.wrongLines, 20)
  assert.equal(s.closeLines, 1)
  // ۷ و ۸ پشت‌سرهم؛ ۹ نیمه‌تموم زنجیر رو می‌بُره؛ ۱۰ امروزه
  assert.equal(s.maxStreak, 2)
  assert.equal(s.currentStreak, 1)
})

test('رکورد فعلی وقتی آخرین روز تموم‌شده قدیمیه صفره', () => {
  const s = getLyricsStats('player-a', '2026-03-20')
  assert.equal(s.currentStreak, 0)
  assert.equal(s.maxStreak, 2)
})

test('مهمان: 401', async () => {
  const res = await fetch(`${baseUrl}/api/lyrics/stats`)
  assert.equal(res.status, 401)
})
