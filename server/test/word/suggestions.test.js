// تست «فکر می‌کنم درسته»: کلمه‌ی ردشده ذخیره می‌شه؛ کلمه‌ی موجود، بی‌معنی و ناجور رد می‌شه؛ سقف روزانه؛ انتقال به حساب
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { validWords } = await import('../../games/word/wordLists.js')
const { MAX_SUGGESTIONS_PER_DAY } = await import('../../games/word/suggestions.js')

let server
let baseUrl
before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

async function newPlayer() {
  const res = await fetch(`${baseUrl}/api/word/game`)
  return res.headers.get('set-cookie').split(';')[0]
}
async function suggest(cookie, word) {
  const res = await fetch(`${baseUrl}/api/word/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ word }),
  })
  return { status: res.status, body: await res.json() }
}
const rows = (key) => db.prepare('SELECT word, length FROM word_suggestions WHERE player_key = ? ORDER BY word').all(key)
const keyOf = (cookie) => cookie.split('=')[1]

// چند کلمه‌ی حروف‌مجاز که توی لیست‌ها نیستن (پیدا کردنشون از روی خود لیست‌ها، تا تست به لیست‌ها وابسته نباشه)
function unknownWords(length, count) {
  const letters = Array.from('بتثجحخدذرزسشصضطعفقکگلمنهی')
  const out = []
  for (const a of letters) for (const b of letters) for (const c of letters) {
    if (length === 3 && a !== b && b !== c) {
      const w = a + b + c
      if (!validWords(3).has(w)) out.push(w)
    }
    if (length === 4 && a !== b && b !== c) for (const d of ['ک', 'ث']) {
      const w = a + b + c + d
      if (!validWords(4).has(w)) out.push(w)
    }
    if (out.length >= count) return out
  }
  return out
}

test('کلمه‌ی ردشده ذخیره می‌شه (مهمان هم می‌تونه)، نرمال‌شده و با طولش', async () => {
  const cookie = await newPlayer()
  const [three] = unknownWords(3, 1)
  const [four] = unknownWords(4, 1)
  const r3 = await suggest(cookie, three)
  assert.equal(r3.status, 200)
  assert.equal(r3.body.ok, true)
  assert.equal((await suggest(cookie, four)).status, 200)
  assert.deepEqual(rows(keyOf(cookie)).map((r) => r.length).sort(), [3, 4])
  // ي و ك عربی، فاصله و نیم‌فاصله یکسان می‌شن
  const arabic = Array.from(unknownWords(3, 3).at(-1)).join('‌ ').replace('ی', 'ي')
  assert.equal((await suggest(cookie, arabic)).status, 200)
  assert.equal(rows(keyOf(cookie)).length, 3)
  assert.ok(rows(keyOf(cookie)).every((r) => !/[يك\s‌]/.test(r.word)))
})

test('همون کلمه دوباره: خطا نیست ولی یه ردیف می‌مونه و دوباره شمرده نمی‌شه', async () => {
  const cookie = await newPlayer()
  const [w] = unknownWords(3, 1)
  assert.equal((await suggest(cookie, w)).status, 200)
  assert.equal((await suggest(cookie, w)).status, 200)
  assert.equal(rows(keyOf(cookie)).length, 1)
  // بازیکن دیگه همون کلمه رو جدا پیشنهاد می‌ده
  const other = await newPlayer()
  assert.equal((await suggest(other, w)).status, 200)
  const both = db.prepare('SELECT COUNT(*) AS n FROM word_suggestions WHERE word = ? AND player_key IN (?, ?)').get(w, keyOf(cookie), keyOf(other)).n
  assert.equal(both, 2)
})

test('کلمه‌ی موجود توی لیست، حرف ناجور، طول اشتباه و بی‌معنیِ واضح رد می‌شه', async () => {
  const cookie = await newPlayer()
  assert.equal((await suggest(cookie, 'دست')).body.error, 'ALREADY_IN_LIST')
  assert.equal((await suggest(cookie, 'پرنده')).body.error, 'ALREADY_IN_LIST')
  assert.equal((await suggest(cookie, 'abc')).body.error, 'INVALID_LETTERS')
  assert.equal((await suggest(cookie, 'abcdefgh')).body.error, 'WORD_LENGTH')
  assert.equal((await suggest(cookie, 'پر۲')).body.error, 'INVALID_LETTERS')
  assert.equal((await suggest(cookie, 'پر')).body.error, 'WORD_LENGTH')
  assert.equal((await suggest(cookie, 'کتابخانه')).body.error, 'WORD_LENGTH')
  assert.equal((await suggest(cookie, '')).status, 400)
  assert.equal((await suggest(cookie, null)).status, 400)
  assert.equal((await suggest(cookie, 'ااااا')).body.error, 'NOT_A_WORD')
  assert.equal((await suggest(cookie, 'ببب')).body.error, 'NOT_A_WORD')
  assert.equal(rows(keyOf(cookie)).length, 0)
})

test('سقف روزانه: بعد از ۱۰ کلمه‌ی متفاوت دیگه قبول نیست؛ تکراری‌ها شمرده نمی‌شن', async () => {
  const cookie = await newPlayer()
  const words = unknownWords(4, MAX_SUGGESTIONS_PER_DAY + 1)
  assert.ok(words.length > MAX_SUGGESTIONS_PER_DAY)
  for (let i = 0; i < MAX_SUGGESTIONS_PER_DAY; i++) assert.equal((await suggest(cookie, words[i])).status, 200)
  const over = await suggest(cookie, words[MAX_SUGGESTIONS_PER_DAY])
  assert.equal(over.status, 400)
  assert.equal(over.body.error, 'TOO_MANY_SUGGESTIONS')
  assert.equal((await suggest(cookie, words[0])).status, 200) // قبلاً ثبت شده، خطا نیست
  assert.equal(rows(keyOf(cookie)).length, MAX_SUGGESTIONS_PER_DAY)
})

test('با ثبت‌نام، کلمه‌های پیشنهادی مهمان به حساب منتقل می‌شن', async () => {
  const cookie = await newPlayer()
  const [w] = unknownWords(3, 1)
  await suggest(cookie, w)
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'word_suggester', password: 'pass-1234' }),
  })
  assert.equal(signup.status, 201)
  const userId = (await signup.json()).user.id
  assert.deepEqual(rows(`user:${userId}`).map((r) => r.word), [w])
  assert.equal(rows(keyOf(cookie)).length, 0)
})
