// تست سرتاسری API واژه‌یاب: جواب زودتر لو نره، برد، باخت و خطاها
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { TEST_ANSWER } = await import('../../games/word/dailyWord.js')

let server
let baseUrl

before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
})

// هر «بازیکن» یه مرورگر جداست با کوکی خودش
async function newPlayer() {
  const res = await fetch(`${baseUrl}/api/word/game`)
  const cookie = res.headers.get('set-cookie').split(';')[0]
  return { cookie, game: await res.json() }
}

async function guess(cookie, word) {
  const res = await fetch(`${baseUrl}/api/word/guess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ word }),
  })
  return { status: res.status, body: await res.json() }
}

test('بازی تازه: ۶ حدس، کلمه‌ی ۵ حرفی، بدون جواب', async () => {
  const { game } = await newPlayer()
  assert.equal(game.wordLength, 5)
  assert.equal(game.maxGuesses, 6)
  assert.deepEqual(game.guesses, [])
  assert.equal(game.finished, false)
  assert.equal('answer' in game, false)
  assert.equal(JSON.stringify(game).includes(TEST_ANSWER), false)
})

test('حدس غلط: رنگ حرف‌ها میاد ولی جواب نه', async () => {
  const { cookie } = await newPlayer()
  const { status, body } = await guess(cookie, 'دریچه')
  assert.equal(status, 200)
  assert.equal(body.guesses.length, 1)
  assert.deepEqual(
    body.guesses[0].letters.map((l) => l.result),
    ['present', 'correct', 'absent', 'absent', 'correct']
  )
  assert.equal(body.finished, false)
  assert.equal('answer' in body, false)
})

test('کلمه‌ای که وجود نداره هم قبوله، با ی عربی هم', async () => {
  const { cookie } = await newPlayer()
  const { status, body } = await guess(cookie, 'ضصثقي')
  assert.equal(status, 200)
  assert.equal(body.guesses[0].word, 'ضصثقی')
})

test('طول اشتباه و حرف غیرفارسی خطا می‌ده و حدس حساب نمی‌شه', async () => {
  const { cookie } = await newPlayer()
  assert.equal((await guess(cookie, 'پرند')).body.error, 'WORD_LENGTH')
  assert.equal((await guess(cookie, 'hello')).body.error, 'INVALID_LETTERS')
  assert.equal((await guess(cookie, '')).status, 400)
  const count = db.prepare('SELECT COUNT(*) AS n FROM word_guesses WHERE player_key = ?').get(cookie.split('=')[1]).n
  assert.equal(count, 0)
})

test('برد: جواب میاد و بعدش حدس دیگه قبول نمی‌شه', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, 'دریچه')
  const { body } = await guess(cookie, 'پرنده')
  assert.equal(body.finished, true)
  assert.equal(body.won, true)
  assert.equal(body.answer, TEST_ANSWER)
  const after = await guess(cookie, 'گرسنه')
  assert.equal(after.status, 400)
  assert.equal(after.body.error, 'GAME_OVER')
})

test('باخت بعد از ۶ حدس غلط', async () => {
  const { cookie } = await newPlayer()
  let last
  for (let i = 0; i < 6; i++) {
    last = await guess(cookie, 'گرسنه')
    if (i < 5) assert.equal('answer' in last.body, false)
  }
  assert.equal(last.body.finished, true)
  assert.equal(last.body.won, false)
  assert.equal(last.body.answer, TEST_ANSWER)
  assert.equal((await guess(cookie, 'پرنده')).body.error, 'GAME_OVER')
})

test('بازی با رفرش صفحه سر جاش می‌مونه', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, 'دریچه')
  const res = await fetch(`${baseUrl}/api/word/game`, { headers: { Cookie: cookie } })
  const game = await res.json()
  assert.equal(game.guesses.length, 1)
  assert.equal(game.testMode, false)
})

test('با ثبت‌نام، بازی مهمان به حساب منتقل می‌شه', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, 'دریچه')
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'word_player', password: 'pass-1234' }),
  })
  assert.equal(signup.status, 201)
  const authCookie = signup.headers.getSetCookie().find((c) => c.startsWith('songmore_auth=')).split(';')[0]
  const res = await fetch(`${baseUrl}/api/word/game`, { headers: { Cookie: `${cookie}; ${authCookie}` } })
  const game = await res.json()
  assert.equal(game.guesses.length, 1)
  assert.equal(game.guesses[0].word, 'دریچه')
})
