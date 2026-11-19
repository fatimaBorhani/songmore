// تست بازی «کلمه‌ی پنهان»: رتبه‌ها، جواب زودتر لو نره، راهنما، تسلیم، خطاها و انتقال بازی مهمان به حساب
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
const { useClueFixture } = await import('./fixture.js')
useClueFixture() // داده‌ی کوچیک و ثابت به‌جای فایل‌های واقعی

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { getTodayDateString } = await import('../../core/today.js')
const { answerWords, isValidWord, ranksFor } = await import('../../games/clue/words.js')
const { nextHintRank } = await import('../../games/clue/game.js')
const { getDailyClue } = await import('../../games/clue/daily.js')

// کلمه‌ی امروز رو ثابت می‌کنیم تا تست قطعی باشه
const TODAY = getTodayDateString()
const ANSWER = 'کتاب'

let server
let baseUrl

before(() => {
  db.prepare('INSERT INTO clue_daily (date, word) VALUES (?, ?)').run(TODAY, ANSWER)
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => server.close())

const cookieOf = (res, name) => res.headers.getSetCookie().find((c) => c.startsWith(name + '='))?.split(';')[0]

async function newPlayer() {
  const res = await fetch(`${baseUrl}/api/clue/game`)
  return { cookie: cookieOf(res, 'songmore_session'), game: await res.json() }
}

async function post(path, cookie, body) {
  const res = await fetch(`${baseUrl}/api/clue/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body ?? {}),
  })
  return { status: res.status, body: await res.json() }
}

const guess = (cookie, word) => post('guess', cookie, { word })

test('رتبه‌ها: همه‌ی کلمه‌ها عدد دارن، خود جواب ۱ و ترتیب درسته', () => {
  const { list, byWord } = ranksFor(ANSWER)
  assert.equal(list.length, byWord.size)
  assert.deepEqual(list.slice(0, 5), ['کتاب', 'کتابی', 'کتب', 'کتاب‌ها', 'رمان'])
  for (const answer of answerWords()) {
    assert.equal(ranksFor(answer).byWord.get(answer), 1, answer)
    assert.ok(isValidWord(answer), answer)
  }
})

test('شروع بازی: هیچ حدسی نیست و جواب لو نمی‌ره', async () => {
  const { game } = await newPlayer()
  assert.equal(game.date, TODAY)
  assert.deepEqual(game.guesses, [])
  assert.equal(game.finished, false)
  assert.equal(game.answer, null)
  assert.deepEqual(game.near, [])
  assert.equal(game.bestRank, null)
  assert.ok(!JSON.stringify(game).includes(ANSWER))
})

test('حدس: رتبه‌ی درست برای همه‌ی کلمه‌ها (حتی دورها)، نیم‌فاصله و ي عربی فرقی نمی‌کنن', async () => {
  const { cookie } = await newPlayer()
  let res = await guess(cookie, 'رمان')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.guesses, [{ number: 1, word: 'رمان', rank: 5, hint: false }])
  assert.equal(res.body.bestRank, 5)

  res = await guess(cookie, 'کتابها') // بدون نیم‌فاصله
  assert.equal(res.body.guesses[1].word, 'کتاب‌ها')
  assert.equal(res.body.guesses[1].rank, 4)

  res = await guess(cookie, 'ماشين') // ي عربی
  assert.equal(res.body.guesses[2].word, 'ماشین')
  assert.ok(res.body.guesses[2].rank > 12) // دور ولی با عدد
  assert.equal(res.body.maxRank, 27)
  assert.equal(res.body.guessCount, 3)
  assert.equal(res.body.finished, false)
  assert.equal(res.body.answer, null)
})

test('خطاها: کلمه‌ی ناموجود، تکراری و خالی', async () => {
  const { cookie } = await newPlayer()
  assert.deepEqual(await guess(cookie, 'قثقثقث'), { status: 400, body: { error: 'NOT_IN_LIST' } })
  assert.deepEqual(await guess(cookie, ''), { status: 400, body: { error: 'INVALID_WORD' } })
  assert.deepEqual(await guess(cookie, 12), { status: 400, body: { error: 'INVALID_WORD' } })
  assert.deepEqual(await guess(cookie, 'ا'.repeat(31)), { status: 400, body: { error: 'INVALID_WORD' } })
  await guess(cookie, 'سیب')
  assert.deepEqual(await guess(cookie, ' سیب '), { status: 400, body: { error: 'ALREADY_GUESSED' } })
})

test('پیدا کردن جواب: بازی تموم می‌شه، جواب و کلمه‌های نزدیک میان، حدس بعدی قبول نیست', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, 'رمان')
  const res = await guess(cookie, ANSWER)
  assert.equal(res.body.found, true)
  assert.equal(res.body.finished, true)
  assert.equal(res.body.answer, ANSWER)
  assert.equal(res.body.near.length, 10)
  assert.deepEqual(res.body.near[0], { word: 'کتابی', rank: 2 })
  assert.deepEqual(await guess(cookie, 'سیب'), { status: 400, body: { error: 'GAME_OVER' } })
  assert.deepEqual(await post('hint', cookie), { status: 400, body: { error: 'GAME_OVER' } })
  assert.deepEqual(await post('giveup', cookie), { status: 400, body: { error: 'GAME_OVER' } })
})

test('راهنما: کلمه‌ی نزدیک‌تر از بهترین حدس، هیچ‌وقت خود جواب', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, 'رمان') // رتبه‌ی ۵
  let res = await post('hint', cookie)
  assert.equal(res.status, 200)
  const hint = res.body.guesses.at(-1)
  assert.deepEqual(hint, { number: 2, word: 'کتاب‌ها', rank: 4, hint: true })
  assert.equal(res.body.hintCount, 1)
  assert.equal(res.body.guessCount, 1)
  res = await post('hint', cookie) // ۳
  res = await post('hint', cookie) // ۲
  assert.deepEqual(res.body.guesses.map((g) => g.rank), [5, 4, 3, 2])
  assert.equal(res.body.finished, false)
  assert.deepEqual(await post('hint', cookie), { status: 400, body: { error: 'NO_HINTS' } })
})

test('nextHintRank: قانون انتخاب رتبه‌ی راهنما', () => {
  assert.equal(nextHintRank([], 1000), 300) // بدون حدس
  assert.equal(nextHintRank([null, null], 1000), 300) // فقط حدس‌های دور
  assert.equal(nextHintRank([], 150), 150) // لیست کوتاه‌تر
  assert.equal(nextHintRank([100], 1000), 80) // ۸۰٪
  assert.equal(nextHintRank([21], 1000), 17)
  assert.equal(nextHintRank([12], 1000), 11) // زیر ۲۰: یه پله
  assert.equal(nextHintRank([12, 11, 10], 1000), 9)
  assert.equal(nextHintRank([3], 1000), 2)
  assert.equal(nextHintRank([2], 1000), null) // فقط جواب مونده
  assert.equal(nextHintRank([1000, 640, null], 1000), 512) // فقط بهترین رتبه مهمه
  assert.equal(nextHintRank([3, 2], 1000), null)
})

test('تسلیم: جواب میاد و بازی تموم می‌شه', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, 'سیب')
  const res = await post('giveup', cookie)
  assert.equal(res.body.gaveUp, true)
  assert.equal(res.body.found, false)
  assert.equal(res.body.finished, true)
  assert.equal(res.body.answer, ANSWER)
  assert.deepEqual(await guess(cookie, 'رمان'), { status: 400, body: { error: 'GAME_OVER' } })
})

test('بازی مهمان با ثبت‌نام به حساب منتقل می‌شه', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, 'رمان')
  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'clueplayer', password: 'pass-1234' }),
  })
  assert.equal(res.status, 201)
  const auth = cookieOf(res, 'songmore_auth')
  // از یه مرورگر دیگه (بدون کوکی مهمان) فقط با حساب
  const game = await (await fetch(`${baseUrl}/api/clue/game`, { headers: { Cookie: auth } })).json()
  assert.deepEqual(game.guesses.map((g) => g.word), ['رمان'])
})

test('بیرون از حالت تست، ریست کار نمی‌کنه', async () => {
  const { cookie } = await newPlayer()
  assert.equal((await post('test/reset', cookie)).status, 404)
})

test('کلمه‌ی روزانه برای هر تاریخ یه بار انتخاب می‌شه و ثابت می‌مونه', () => {
  const first = getDailyClue('2000-01-01')
  assert.ok(answerWords().includes(first))
  assert.equal(getDailyClue('2000-01-01'), first)
  assert.notEqual(getDailyClue('2000-01-02'), first) // کلمه‌ی استفاده‌شده دوباره نمیاد (تا جواب‌ها تموم نشن)
})
