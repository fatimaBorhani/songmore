// تست سرتاسری API واژه‌یاب: هر روز ۳ کلمه (۳، ۴ و ۵ حرفی) یکی‌یکی، جواب زودتر لو نره، برد، باخت و خطاها
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { getTodayDateString } = await import('../../core/today.js')
const { getDailyWords } = await import('../../games/word/dailyWord.js')
const { answerWords, validWords } = await import('../../games/word/wordLists.js')

// کلمه‌های امروز رو ثابت می‌کنیم تا تست قطعی باشه
const TODAY = getTodayDateString()
const ANSWERS = { 3: 'دست', 4: 'کتاب', 5: 'پرنده' }
const WRONG = { 3: 'برف', 4: 'خانه', 5: 'گرسنه' } // کلمه‌ی درست ولی غلط‌ِ جواب
const MAX = { 3: 6, 4: 6, 5: 6 }

let server
let baseUrl

before(() => {
  for (const [length, word] of Object.entries(ANSWERS)) {
    db.prepare('INSERT INTO word_daily (date, length, word) VALUES (?, ?, ?)').run(TODAY, Number(length), word)
  }
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

async function getGame(cookie) {
  return (await fetch(`${baseUrl}/api/word/game`, { headers: { Cookie: cookie } })).json()
}

async function guess(cookie, word) {
  const res = await fetch(`${baseUrl}/api/word/guess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ word }),
  })
  return { status: res.status, body: await res.json() }
}

// کلمه‌ی جاری رو با یه حدس درست می‌بره
const win = async (cookie, length) => (await guess(cookie, ANSWERS[length])).body

test('کلمه‌های ثابت تست همه توی لیست‌ها هستن', () => {
  for (const length of [3, 4, 5]) {
    assert.ok(answerWords(length).includes(ANSWERS[length]), ANSWERS[length])
    assert.ok(validWords(length).has(WRONG[length]), WRONG[length])
    assert.notEqual(WRONG[length], ANSWERS[length])
  }
  assert.ok(validWords(5).has('دریچه'))
})

test('بازی تازه: اول کلمه‌ی ۳ حرفی با ۶ حدس، بدون جواب', async () => {
  const { game } = await newPlayer()
  assert.equal(game.slot, 1)
  assert.equal(game.slotCount, 3)
  assert.equal(game.wordLength, 3)
  assert.equal(game.maxGuesses, 6)
  assert.deepEqual(game.guesses, [])
  assert.equal(game.finished, false)
  assert.equal(game.dayFinished, false)
  assert.deepEqual(game.slots.map((s) => [s.length, s.maxGuesses, s.finished]), [[3, 6, false], [4, 6, false], [5, 6, false]])
  assert.equal('answer' in game, false)
  const text = JSON.stringify(game)
  for (const word of Object.values(ANSWERS)) assert.equal(text.includes(word), false, `${word} لو رفته`)
})

test('کلمه‌های هر روز برای همه یکیه و ذخیره می‌شن', async () => {
  const other = '2026-03-03'
  const first = getDailyWords(other)
  const second = getDailyWords(other)
  assert.deepEqual(first, second)
  assert.deepEqual(first.map((d) => d.length), [3, 4, 5])
  for (const { length, word } of first) assert.ok(answerWords(length).includes(word))
  const rows = db.prepare('SELECT COUNT(*) AS n FROM word_daily WHERE date = ?').get(other).n
  assert.equal(rows, 3)
})

test('هر طول تا تموم نشدن جواب‌هاش تکراری نمیاد', () => {
  const seen = new Set()
  for (let day = 1; day <= 40; day++) {
    const date = `2027-01-${String(day).padStart(2, '0')}`
    const three = getDailyWords(date)[0].word
    assert.equal(seen.has(three), false, `${three} تکراری اومد`)
    seen.add(three)
  }
})

test('حدس غلط: رنگ حرف‌ها میاد ولی جواب نه', async () => {
  const { cookie } = await newPlayer()
  const { status, body } = await guess(cookie, 'برف') // دست: «ر» و «ب» و «ف» هیچ‌کدوم توی دست نیستن
  assert.equal(status, 200)
  assert.equal(body.guesses.length, 1)
  assert.deepEqual(body.guesses[0].letters.map((l) => l.result), ['absent', 'absent', 'absent'])
  assert.equal(body.finished, false)
  assert.equal('answer' in body, false)
  const second = await guess(cookie, 'شیر')
  assert.equal(second.body.guesses.length, 2)
})

test('کلمه‌ی بی‌معنی رد می‌شه و حدس حساب نمی‌شه؛ ی عربی قبوله', async () => {
  const { cookie } = await newPlayer()
  const bad = await guess(cookie, 'ضصث')
  assert.equal(bad.status, 400)
  assert.equal(bad.body.error, 'NOT_IN_LIST')
  const arabic = await guess(cookie, 'شير') // «ي» عربی -> شیر
  assert.equal(arabic.status, 200)
  assert.equal(arabic.body.guesses[0].word, 'شیر')
  const count = db.prepare('SELECT COUNT(*) AS n FROM word_guesses WHERE player_key = ?').get(cookie.split('=')[1]).n
  assert.equal(count, 1)
})

test('طول اشتباه و حرف غیرفارسی خطا می‌ده', async () => {
  const { cookie } = await newPlayer()
  assert.equal((await guess(cookie, 'پرنده')).body.error, 'WORD_LENGTH') // الان ۳ حرفی می‌خوایم
  assert.equal((await guess(cookie, 'پر')).body.error, 'WORD_LENGTH')
  assert.equal((await guess(cookie, 'abc')).body.error, 'INVALID_LETTERS')
  assert.equal((await guess(cookie, 'پر۲')).body.error, 'INVALID_LETTERS')
  assert.equal((await guess(cookie, '')).status, 400)
})

test('برد کلمه‌ی ۳ حرفی: جواب میاد و کلمه‌ی ۴ حرفی باز می‌شه', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, WRONG[3])
  const won = await win(cookie, 3)
  assert.equal(won.finished, true)
  assert.equal(won.won, true)
  assert.equal(won.answer, 'دست')
  assert.equal(won.slot, 1)
  assert.equal(won.dayFinished, false)
  assert.deepEqual(won.slots.map((s) => s.finished), [true, false, false])
  assert.equal(won.slots[0].answer, 'دست')
  assert.equal(won.slots[0].guessCount, 2)
  assert.equal(won.slots[0].rows.length, 2)
  assert.equal('answer' in won.slots[1], false)

  // رفرش: کلمه‌ی ۴ حرفی، تازه و بدون جواب
  const next = await getGame(cookie)
  assert.equal(next.slot, 2)
  assert.equal(next.wordLength, 4)
  assert.equal(next.maxGuesses, 6)
  assert.equal(next.finished, false)
  assert.equal('answer' in next, false)
  assert.equal(JSON.stringify(next.guesses), '[]')
  // حدس بعدی برای ۴ حرفیه
  assert.equal((await guess(cookie, 'دست')).body.error, 'WORD_LENGTH')
  assert.equal((await guess(cookie, WRONG[4])).status, 200)
})

const giveUp = async (cookie) => {
  const res = await fetch(`${baseUrl}/api/word/giveup`, { method: 'POST', headers: { Cookie: cookie } })
  return { status: res.status, body: await res.json() }
}

// ۶ حدس غلط برای کلمه‌ی جاری
async function useAllGuesses(cookie, length) {
  let last
  for (let i = 0; i < MAX[length]; i++) last = await guess(cookie, WRONG[length])
  return last.body
}

test('۶ حدس غلط: کلمه هنوز تموم نشده، جواب نمیاد و حدس بعدی قبوله', async () => {
  const { cookie } = await newPlayer()
  const state = await useAllGuesses(cookie, 3)
  assert.equal(state.guesses.length, 6)
  assert.equal(state.finished, false)
  assert.equal(state.exhausted, true)
  assert.equal(state.won, false)
  assert.equal(state.slot, 1)
  assert.equal('answer' in state, false)
  assert.equal(JSON.stringify(state).includes('دست'), false)

  // ادامه: حدس هفتم هم ثبت می‌شه و بازی هنوز تموم نیست
  const seventh = await guess(cookie, WRONG[3])
  assert.equal(seventh.status, 200)
  assert.equal(seventh.body.guesses.length, 7)
  assert.equal(seventh.body.finished, false)
  assert.equal('answer' in seventh.body, false)
  // رفرش: همه‌ی حدس‌ها سر جاشونه
  assert.equal((await getGame(cookie)).guesses.length, 7)
})

test('ادامه تا پیدا کردن: کلمه تموم می‌شه ولی برد حساب نمی‌شه', async () => {
  const { cookie } = await newPlayer()
  await useAllGuesses(cookie, 3)
  await guess(cookie, WRONG[3])
  const found = (await guess(cookie, ANSWERS[3])).body
  assert.equal(found.finished, true)
  assert.equal(found.solved, true)
  assert.equal(found.won, false)
  assert.equal(found.exhausted, false)
  assert.equal(found.answer, 'دست')
  assert.equal(found.guesses.length, 8)
  assert.equal(found.dayFinished, false)
  assert.deepEqual([found.slots[0].won, found.slots[0].solved, found.slots[0].guessCount], [false, true, 8])
  // کلمه‌ی بعدی باز شده
  assert.equal((await getGame(cookie)).slot, 2)
})

test('«جواب رو ببینم»: بعد از ۶ حدس غلط جواب میاد، باخت حساب می‌شه و کلمه‌ی بعدی باز می‌شه', async () => {
  const { cookie } = await newPlayer()
  await useAllGuesses(cookie, 3)
  const res = await giveUp(cookie)
  assert.equal(res.status, 200)
  assert.equal(res.body.finished, true)
  assert.equal(res.body.solved, false)
  assert.equal(res.body.won, false)
  assert.equal(res.body.answer, 'دست')
  assert.equal(res.body.slot, 1)
  assert.equal(res.body.dayFinished, false)
  assert.deepEqual(res.body.slots.map((s) => s.finished), [true, false, false])
  const next = await getGame(cookie)
  assert.equal(next.slot, 2)
  assert.equal(next.wordLength, 4)
  assert.equal('answer' in next, false)
})

test('«جواب رو ببینم» قبل از تموم شدن ۶ حدس یا دوباره قبول نیست', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, WRONG[3])
  const early = await giveUp(cookie)
  assert.equal(early.status, 400)
  assert.equal(early.body.error, 'GUESSES_LEFT')
  assert.equal('answer' in early.body, false)
  // کلمه‌ی ۳ حرفی تموم می‌شه؛ «جواب» برای کلمه‌ی ۴ حرفیِ تازه هم زودتره
  await useAllGuesses(cookie, 3)
  assert.equal((await giveUp(cookie)).status, 200)
  assert.equal((await giveUp(cookie)).body.error, 'GUESSES_LEFT')
})

test('بعد از «جواب رو ببینم» آخرین کلمه، بازی روز تموم می‌شه', async () => {
  const { cookie } = await newPlayer()
  await win(cookie, 3)
  await win(cookie, 4)
  await useAllGuesses(cookie, 5)
  const res = await giveUp(cookie)
  assert.equal(res.body.dayFinished, true)
  assert.deepEqual(res.body.slots.map((s) => s.won), [true, true, false])
  assert.equal((await giveUp(cookie)).body.error, 'GAME_OVER')
  assert.equal((await guess(cookie, WRONG[5])).body.error, 'GAME_OVER')
})

test('هر سه کلمه: بعد از آخری بازی روز تموم می‌شه و حدس جدید قبول نیست', async () => {
  const { cookie } = await newPlayer()
  await win(cookie, 3)
  await win(cookie, 4)
  const last = await win(cookie, 5)
  assert.equal(last.slot, 3)
  assert.equal(last.wordLength, 5)
  assert.equal(last.dayFinished, true)
  assert.deepEqual(last.slots.map((s) => [s.won, s.answer]), [[true, 'دست'], [true, 'کتاب'], [true, 'پرنده']])
  const again = await guess(cookie, WRONG[5])
  assert.equal(again.status, 400)
  assert.equal(again.body.error, 'GAME_OVER')
  // رفرش آخر روز: همون خلاصه
  const game = await getGame(cookie)
  assert.equal(game.dayFinished, true)
  assert.equal(game.slots.length, 3)
})

test('بازی با رفرش صفحه سر جاش می‌مونه', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, WRONG[3])
  const game = await getGame(cookie)
  assert.equal(game.guesses.length, 1)
  assert.equal(game.testMode, false)
})

test('دکمه‌ی تست فقط توی حالت تست کار می‌کنه', async () => {
  const { cookie } = await newPlayer()
  const res = await fetch(`${baseUrl}/api/word/test/reset`, { method: 'POST', headers: { Cookie: cookie } })
  assert.equal(res.status, 404)
})

test('با ثبت‌نام، بازی مهمان به حساب منتقل می‌شه', async () => {
  const { cookie } = await newPlayer()
  await guess(cookie, WRONG[3])
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'word_player', password: 'pass-1234' }),
  })
  assert.equal(signup.status, 201)
  const authCookie = signup.headers.getSetCookie().find((c) => c.startsWith('songmore_auth=')).split(';')[0]
  const game = await getGame(`${cookie}; ${authCookie}`)
  assert.equal(game.guesses.length, 1)
  assert.equal(game.guesses[0].word, 'برف')
})

test('با ثبت‌نام، «جواب رو ببینم»ِ مهمان هم به حساب منتقل می‌شه', async () => {
  const { cookie } = await newPlayer()
  await useAllGuesses(cookie, 3)
  await giveUp(cookie)
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'word_giveup', password: 'pass-1234' }),
  })
  assert.equal(signup.status, 201)
  const authCookie = signup.headers.getSetCookie().find((c) => c.startsWith('songmore_auth=')).split(';')[0]
  const game = await getGame(`${cookie}; ${authCookie}`)
  // کلمه‌ی ۳ حرفی تموم‌شده (با جواب) و بازی روی کلمه‌ی ۴ حرفیه
  assert.equal(game.slot, 2)
  assert.deepEqual([game.slots[0].finished, game.slots[0].answer, game.slots[0].won], [true, 'دست', false])
})
