// تست «آهنگم توی لیست نیست»: پیشنهاد آهنگ ذخیره می‌شه؛ متن خالی/خیلی بلند رد می‌شه؛ تکراری دوباره شمرده نمی‌شه؛ سقف روزانه؛ انتقال به حساب
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { MAX_SONG_SUGGESTIONS_PER_DAY } = await import('../../games/song/suggestions.js')

let server
let baseUrl
before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

// یه مرورگر تازه (کوکی نشست)
async function newPlayer() {
  const res = await fetch(`${baseUrl}/api/word/game`)
  return res.headers.get('set-cookie').split(';')[0]
}
async function suggest(cookie, title, artist) {
  const res = await fetch(`${baseUrl}/api/song/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ title, artist }),
  })
  return { status: res.status, body: await res.json() }
}
const rows = (key) => db.prepare('SELECT title, artist FROM song_suggestions WHERE player_key = ? ORDER BY title').all(key)
const keyOf = (cookie) => cookie.split('=')[1]

test('پیشنهاد آهنگ با خواننده و بدون خواننده ذخیره می‌شه (فاصله‌های اضافه تمیز می‌شن)', async () => {
  const cookie = await newPlayer()
  assert.deepEqual(await suggest(cookie, '  آهنگ   تازه ', ' خواننده‌ی خوب '), { status: 200, body: { ok: true } })
  assert.deepEqual(await suggest(cookie, 'فقط اسم'), { status: 200, body: { ok: true } })
  assert.deepEqual(rows(keyOf(cookie)), [
    { title: 'آهنگ تازه', artist: 'خواننده‌ی خوب' },
    { title: 'فقط اسم', artist: '' },
  ])
})

test('اسم خالی، یه حرفی یا فقط علامت INVALID_TITLE؛ خیلی بلند خطای خودش', async () => {
  const cookie = await newPlayer()
  for (const title of ['', '   ', 'آ', '!!!', undefined, 42]) {
    assert.deepEqual(await suggest(cookie, title, 'کسی'), { status: 400, body: { error: 'INVALID_TITLE' } })
  }
  assert.deepEqual(await suggest(cookie, 'ب'.repeat(81)), { status: 400, body: { error: 'TITLE_TOO_LONG' } })
  assert.deepEqual(await suggest(cookie, 'اسم درست', 'ک'.repeat(61)), { status: 400, body: { error: 'ARTIST_TOO_LONG' } })
  assert.deepEqual(rows(keyOf(cookie)), [])
})

test('همون آهنگ دوباره (حتی با ي عربی و نیم‌فاصله‌ی متفاوت) خطا نیست ولی دوباره ذخیره نمی‌شه', async () => {
  const cookie = await newPlayer()
  await suggest(cookie, 'دلتنگی', 'علی')
  assert.equal((await suggest(cookie, 'دلتنگي', ' علی ')).status, 200)
  assert.equal(rows(keyOf(cookie)).length, 1)
  // همون اسم با خواننده‌ی دیگه یه آهنگ دیگه‌ست
  await suggest(cookie, 'دلتنگی', 'رضا')
  assert.equal(rows(keyOf(cookie)).length, 2)
})

test(`روزی حداکثر ${MAX_SONG_SUGGESTIONS_PER_DAY} آهنگ تازه`, async () => {
  const cookie = await newPlayer()
  for (let i = 0; i < MAX_SONG_SUGGESTIONS_PER_DAY; i++) {
    assert.equal((await suggest(cookie, `آهنگ شماره ${i}`)).status, 200)
  }
  assert.deepEqual(await suggest(cookie, 'یکی دیگه'), { status: 400, body: { error: 'TOO_MANY_SUGGESTIONS' } })
  // تکراری هنوز خطا نیست
  assert.equal((await suggest(cookie, 'آهنگ شماره 0')).status, 200)
})

test('با ثبت‌نام، پیشنهادهای مهمان به حساب منتقل می‌شن', async () => {
  const cookie = await newPlayer()
  await suggest(cookie, 'آهنگ مهمان', 'کسی')
  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'songfan', password: 'password123' }),
  })
  assert.equal(res.status, 201)
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get('songfan')
  assert.deepEqual(rows(`user:${user.id}`), [{ title: 'آهنگ مهمان', artist: 'کسی' }])
  assert.deepEqual(rows(keyOf(cookie)), [])
})
