// تست سرتاسری API حافظه‌ی رنگ: رنگ‌ها لو نرن، امتیاز، ۵ دور، خطاها و انتقال بازی مهمان
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { getTodayDateString } = await import('../../core/today.js')
const { app } = await import('../../index.js')

let server
let baseUrl
const TODAY = getTodayDateString()

before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
})

// هر «بازیکن» یه مرورگره با کوکی خودش
function newBrowser() {
  const cookies = {}
  async function request(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    for (const c of res.headers.getSetCookie()) {
      const [name, value] = c.split(';')[0].split('=')
      cookies[name] = value
    }
    return { status: res.status, body: await res.json() }
  }
  return {
    game: () => request('/api/color/game'),
    start: () => request('/api/color/start', { method: 'POST' }),
    guess: (color) => request('/api/color/guess', { method: 'POST', body: color }),
    signup: (username) => request('/api/auth/signup', { method: 'POST', body: { username, password: 'pass-1234' } }),
  }
}

const dailyColors = () => db.prepare('SELECT h, s, b FROM color_daily WHERE date = ? ORDER BY round').all(TODAY)

test('بازی تازه: ۰ دور انجام شده، ۵ دور، هیچ رنگی لو نمیره', async () => {
  const b = newBrowser()
  const { status, body } = await b.game()
  assert.equal(status, 200)
  assert.equal(body.completed, 0)
  assert.equal(body.finished, false)
  assert.equal(body.roundCount, 5)
  assert.equal(body.memorizeSeconds, 5)
  assert.deepEqual(body.rounds, [])
  assert.equal(body.maxTotal, 50)
  assert.equal(body.testMode, false)
  // رنگ‌های امروز ساخته شدن ولی توی جواب نیستن
  const colors = dailyColors()
  assert.equal(colors.length, 5)
  assert.equal(JSON.stringify(body).includes('"target"'), false)
})

test('شروع دور: فقط رنگ دور اول، و برای همه‌ی بازیکن‌ها یکی', async () => {
  const a = newBrowser()
  const b = newBrowser()
  const first = await a.start()
  assert.equal(first.status, 200)
  assert.equal(first.body.round, 1)
  assert.deepEqual(first.body.color, dailyColors()[0])
  assert.deepEqual((await b.start()).body.color, first.body.color)
  assert.deepEqual((await a.start()).body, first.body) // رفرش وسط دور: همون رنگ
  assert.deepEqual(Object.keys(first.body).sort(), ['color', 'round']) // رنگ دورهای بعدی نیست
})

test('حدس دقیق: امتیاز ۱۰ و رنگ اصلی بعد از ثبت میاد (نه دورهای بعد)', async () => {
  const b = newBrowser()
  const { body: start } = await b.start()
  const { status, body } = await b.guess(start.color)
  assert.equal(status, 200)
  assert.equal(body.completed, 1)
  assert.equal(body.rounds[0].score, 10)
  assert.equal(body.rounds[0].deltaE, 0)
  assert.deepEqual(body.rounds[0].target, start.color)
  assert.deepEqual(body.rounds[0].guess, start.color)
  assert.deepEqual(body.rounds[0].diff, { h: 0, s: 0, b: 0 })
  assert.equal(body.total, 10)
  const text = JSON.stringify(body)
  const later = dailyColors()[1]
  // رنگ دور دوم فقط وقتی ممکنه توی متن باشه که تصادفاً با رنگ دور اول یکی باشه
  if (JSON.stringify(later) !== JSON.stringify(dailyColors()[0])) {
    assert.equal(text.includes(JSON.stringify(later)), false)
  }
  assert.equal((await b.start()).body.round, 2)
})

test('حدس دور: رنگ دور بعد، امتیاز کمتر برای حدس دورتر، اختلاف علامت‌دار', async () => {
  const b = newBrowser()
  const { body: start } = await b.start()
  const near = { h: (start.color.h + 6) % 360, s: Math.max(0, start.color.s - 8), b: Math.max(0, start.color.b - 5) }
  const { body } = await b.guess(near)
  const r = body.rounds[0]
  assert.equal(r.diff.h, 6)
  assert.equal(r.diff.s, near.s - start.color.s)
  assert.equal(r.diff.b, near.b - start.color.b)
  assert.ok(r.score < 10 && r.score > 3, `score=${r.score}`)

  const far = await b.guess({ h: (start.color.h + 180) % 360, s: 10, b: 10 }) // دور ۲ (رنگ دور ۲ هرچی)
  assert.equal(far.body.completed, 2)
})

test('۵ دور کامل: بازی تموم می‌شه، جمع امتیاز، و بعدش همه‌چی خطا می‌ده', async () => {
  const b = newBrowser()
  let state
  for (let i = 0; i < 5; i++) {
    const { body: start } = await b.start()
    assert.equal(start.round, i + 1)
    assert.deepEqual(start.color, dailyColors()[i])
    state = (await b.guess(start.color)).body
    assert.equal(state.completed, i + 1)
    assert.equal(state.finished, i === 4)
  }
  assert.equal(state.total, 50)
  assert.deepEqual(state.rounds.map((r) => r.target), dailyColors())
  assert.equal((await b.start()).status, 400)
  assert.equal((await b.start()).body.error, 'GAME_OVER')
  const after = await b.guess({ h: 1, s: 1, b: 1 })
  assert.equal(after.status, 400)
  assert.equal(after.body.error, 'GAME_OVER')
  assert.equal((await b.game()).body.finished, true)
})

test('ورودی نامعتبر خطا می‌ده و دور حساب نمی‌شه', async () => {
  const b = newBrowser()
  for (const bad of [{}, { h: 'x', s: 1, b: 1 }, { h: 400, s: 1, b: 1 }, { h: 1, s: 101, b: 1 }, { h: 1.5, s: 1, b: 1 }]) {
    const r = await b.guess(bad)
    assert.equal(r.status, 400)
    assert.equal(r.body.error, 'INVALID_COLOR')
  }
  assert.equal((await b.game()).body.completed, 0)
})

test('رفرش: بازی و حدس‌ها سر جاشون می‌مونن', async () => {
  const b = newBrowser()
  const { body: start } = await b.start()
  await b.guess({ h: 10, s: 20, b: 30 })
  const again = (await b.game()).body
  assert.equal(again.completed, 1)
  assert.deepEqual(again.rounds[0].guess, { h: 10, s: 20, b: 30 })
  assert.deepEqual(again.rounds[0].target, start.color)
})

test('با ثبت‌نام، بازی مهمان به حساب منتقل می‌شه', async () => {
  const b = newBrowser()
  const { body: start } = await b.start()
  await b.guess(start.color)
  const signup = await b.signup('color_player')
  assert.equal(signup.status, 201)
  const after = (await b.game()).body
  assert.equal(after.completed, 1)
  assert.equal(after.rounds[0].score, 10)
})
