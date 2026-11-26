// تست بازی «شعر یادت نره»: نمره‌ی خط‌ها، جواب زودتر لو نره، ترتیب تیکه‌ها، خطاها و انتقال بازی مهمان
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
const { useLyricsFixture, ANSWER_LINES } = await import('./fixture.js')
useLyricsFixture()

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { getTodayDateString } = await import('../../core/today.js')
const { gradeLine, similarity } = await import('../../games/lyrics/grade.js')

const TODAY = getTodayDateString()
let server
let baseUrl

before(() => {
  // آهنگ امروزِ جورزیک = song-1، پس تیکه‌ی p1 نباید بیاد
  db.prepare("INSERT INTO songs (id, title, credit, file_name) VALUES ('song-1', 'S', 'A', 'x.mp3')").run()
  db.prepare("INSERT INTO daily_songs (date, slot, song_id) VALUES (?, 1, 'song-1')").run(TODAY)
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

const cookieOf = (res, name) => res.headers.getSetCookie().find((c) => c.startsWith(name + '='))?.split(';')[0]

async function newPlayer() {
  const res = await fetch(`${baseUrl}/api/lyrics/game`)
  return { cookie: cookieOf(res, 'songmore_session'), game: await res.json() }
}
async function get(cookie) {
  const res = await fetch(`${baseUrl}/api/lyrics/game`, { headers: { Cookie: cookie } })
  return res.json()
}
async function post(path, cookie, body) {
  const res = await fetch(`${baseUrl}/api/lyrics/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body ?? {}),
  })
  return { status: res.status, body: await res.json() }
}

test('نمره: فاصله، نیم‌فاصله و علامت مهم نیست؛ نزدیک و غلط', () => {
  assert.equal(gradeLine('ستاره ها رو یکی یکی میشمارم!', ANSWER_LINES[0]), 'ok')
  assert.equal(gradeLine('ستاره‌ها رو دونه دونه می‌شمرم', ANSWER_LINES[0]), 'close')
  assert.equal(gradeLine('یه چیز دیگه', ANSWER_LINES[0]), 'wrong')
  assert.equal(gradeLine('', ANSWER_LINES[0]), 'wrong')
  assert.equal(similarity(ANSWER_LINES[1], ANSWER_LINES[1]), 1)
})

test('۳ تیکه برای امروز، بدون آهنگ امروزِ جورزیک', async () => {
  const { game } = await newPlayer()
  assert.equal(game.songCount, 3)
  assert.equal(game.slot, 1)
  assert.equal(game.maxPoints, 12)
  const ids = db.prepare('SELECT puzzle_id FROM lyrics_daily WHERE date = ?').all(TODAY).map((r) => r.puzzle_id)
  assert.equal(new Set(ids).size, 3)
  assert.ok(!ids.includes('p1'))
})

test('قبل از جواب: نه دو خط جواب، نه کلیپ بعدش', async () => {
  const { game } = await newPlayer()
  const text = JSON.stringify(game)
  for (const line of ANSWER_LINES) assert.ok(!text.includes(line), 'جواب لو رفت')
  assert.ok(!text.includes('-b.mp3'), 'کلیپ بعد از سؤال لو رفت')
  assert.equal(game.slots[0].lines.length, 3)
  assert.equal(game.slots[0].clipBefore.startsWith('/clips/lyrics/'), true)
})

test('جواب: نمره، امتیاز و باز شدن تیکه‌ی بعدی', async () => {
  const { cookie } = await newPlayer()
  const res = await post('answer', cookie, { slot: 1, line1: ANSWER_LINES[0], line2: 'نمی‌دونم' })
  assert.equal(res.status, 200)
  const s1 = res.body.slots[0]
  assert.equal(s1.finished, true)
  assert.deepEqual(s1.grades, ['ok', 'wrong'])
  assert.equal(s1.points, 2)
  assert.equal(s1.lines.length, 7)
  assert.ok(s1.clipAfter.endsWith('-b.mp3'))
  assert.equal(res.body.slot, 2)
  assert.equal(res.body.dayPoints, 2)
  // تیکه‌ی بعدی هنوز جوابش لو نرفته
  assert.equal(res.body.slots[1].lines.length, 3)
  assert.equal(res.body.slots[1].clipAfter, undefined)
})

test('خطاها: تیکه‌ی غیرجاری، جواب خالی، خیلی بلند، آخر روز', async () => {
  const { cookie } = await newPlayer()
  assert.equal((await post('answer', cookie, { slot: 2, line1: 'الف' })).body.error, 'NOT_CURRENT')
  assert.equal((await post('answer', cookie, { slot: 1, line1: '  ', line2: '' })).body.error, 'EMPTY_ANSWER')
  assert.equal((await post('answer', cookie, { slot: 1, line1: 'ا'.repeat(121) })).body.error, 'ANSWER_TOO_LONG')
  for (const slot of [1, 2, 3]) {
    assert.equal((await post('answer', cookie, { slot, line1: ANSWER_LINES[0], line2: ANSWER_LINES[1] })).status, 200)
  }
  const game = await get(cookie)
  assert.equal(game.dayFinished, true)
  assert.equal(game.slot, null)
  assert.equal(game.dayPoints, 12)
  assert.equal((await post('answer', cookie, { slot: 3, line1: 'x' })).body.error, 'GAME_OVER')
})

test('مهمان بعد از ثبت‌نام: جواب‌هاش به حساب منتقل می‌شه', async () => {
  const { cookie } = await newPlayer()
  await post('answer', cookie, { slot: 1, line1: ANSWER_LINES[0], line2: ANSWER_LINES[1] })
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'lyricsfan', password: 'pass-1234' }),
  })
  assert.equal(signup.status, 201)
  const both = `${cookie}; ${cookieOf(signup, 'songmore_auth')}`
  const game = await get(both)
  assert.equal(game.slots[0].finished, true)
  assert.equal(game.dayPoints, 4)
})

test('حالت تست خاموشه: test/reset پیدا نمی‌شه', async () => {
  const { cookie } = await newPlayer()
  assert.equal((await post('test/reset', cookie)).status, 404)
})
