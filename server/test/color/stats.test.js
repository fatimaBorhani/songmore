// تست آمار حافظه‌ی رنگ برای صفحه‌ی حساب: امتیاز از روی رنگ‌ها دوباره حساب می‌شه؛ بازی نیمه‌تموم حساب نمی‌شه؛ روزهای پشت‌سرهم
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { getColorStats } = await import('../../games/color/playerStats.js')
const { scoreColor, ROUNDS } = await import('../../games/color/scoring.js')

let server
let baseUrl
before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

const PLAYER = 'color-stats'
const TARGETS = [
  { h: 10, s: 80, b: 70 },
  { h: 80, s: 60, b: 50 },
  { h: 150, s: 90, b: 90 },
  { h: 220, s: 50, b: 60 },
  { h: 300, s: 70, b: 80 },
]
// برای هر دور یه جابه‌جایی توی رنگ‌مایه (offset ۰ = رنگ دقیقاً درسته)
const guessFor = (target, offset) => ({ h: (target.h + offset) % 360, s: target.s, b: target.b })

function addGame(player, date, offset, rounds = ROUNDS) {
  const daily = db.prepare('INSERT OR IGNORE INTO color_daily (date, round, h, s, b) VALUES (?, ?, ?, ?, ?)')
  const insert = db.prepare('INSERT INTO color_guesses (player_key, date, round, h, s, b, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  TARGETS.forEach((t, i) => daily.run(date, i + 1, t.h, t.s, t.b))
  for (let i = 0; i < rounds; i++) {
    const g = guessFor(TARGETS[i], offset)
    insert.run(player, date, i + 1, g.h, g.s, g.b, Date.now())
  }
  return TARGETS.slice(0, rounds).map((t) => scoreColor(t, guessFor(t, offset)))
}
const sum = (list) => Math.round(list.reduce((a, b) => a + b, 0) * 100) / 100

test('آمار رنگ: بازی تموم‌شده، میانگین، بهترین‌ها و روزهای پشت‌سرهم', () => {
  const g1 = addGame(PLAYER, '2026-03-01', 0) // دقیق
  const g2 = addGame(PLAYER, '2026-03-02', 20)
  const g3 = addGame(PLAYER, '2026-03-03', 60)
  const g5 = addGame(PLAYER, '2026-03-05', 10) // یه روز فاصله -> رکورد قطع می‌شه
  addGame(PLAYER, '2026-03-06', 0, 3) // نیمه‌تموم: حساب نمی‌شه
  addGame('somebody-else', '2026-03-01', 0) // بازیکن دیگه

  const totals = [g1, g2, g3, g5].map(sum)
  const stats = getColorStats(PLAYER, '2026-03-05')
  assert.equal(stats.played, 4)
  assert.equal(stats.totalScore, sum(totals))
  assert.equal(stats.averageTotal, Math.round((sum(totals) / 4) * 100) / 100)
  assert.equal(stats.bestTotal, Math.max(...totals))
  assert.equal(stats.bestRound, Math.max(...[g1, g2, g3, g5].flat()))
  assert.equal(stats.averageRound, Math.round((sum([g1, g2, g3, g5].flat()) / 20) * 100) / 100)
  assert.equal(stats.maxTotal, 50)
  assert.ok(stats.bestTotal > 49, 'رنگ دقیق باید نزدیک ۵۰ بشه')
  assert.equal(stats.maxStreak, 3)
  assert.equal(stats.currentStreak, 1) // امروز ۵ اسفنده و همون روز بازی کرده

  // دیروز بازی کرده -> هنوز زنده؛ دو روز پیش بازی کرده -> قطع
  assert.equal(getColorStats(PLAYER, '2026-03-06').currentStreak, 1)
  assert.equal(getColorStats(PLAYER, '2026-03-07').currentStreak, 0)
})

test('بازیکنی که هیچی بازی نکرده: همه‌چیز صفر', () => {
  assert.deepEqual(getColorStats('nobody', '2026-03-05'), {
    played: 0,
    totalScore: 0,
    averageTotal: 0,
    bestTotal: 0,
    averageRound: 0,
    bestRound: 0,
    currentStreak: 0,
    maxStreak: 0,
    maxTotal: 50,
  })
})

test('API آمار: مهمان 401، کاربر واردشده 200', async () => {
  const guest = await fetch(`${baseUrl}/api/color/stats`)
  assert.equal(guest.status, 401)
  const cookie = guest.headers.get('set-cookie').split(';')[0]
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'color_stats', password: 'pass-1234' }),
  })
  assert.equal(signup.status, 201)
  const authCookie = signup.headers.getSetCookie().find((c) => c.startsWith('songmore_auth=')).split(';')[0]
  const res = await fetch(`${baseUrl}/api/color/stats`, { headers: { Cookie: `${cookie}; ${authCookie}` } })
  assert.equal(res.status, 200)
  assert.equal((await res.json()).played, 0)
})
