// تست جدول هفته: روزهای هفته (شنبه تا جمعه)، امتیاز هر بازی (تموم/برد/عالی)، رتبه‌ها و API
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { weekDates, getWeeklyBoard } = await import('../../games/weekly/weekly.js')

let server
let baseUrl
before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
  // سه آهنگ برای روزهای تست
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('a', 'A', 'آ', '[]')").run()
  for (let i = 1; i <= 3; i++) {
    db.prepare('INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES (?, ?, NULL, ?, ?)').run(`s${i}`, `T${i}`, 'A', `s${i}.mp3`)
  }
})
after(() => server.close())

// ۲۰۲۶-۱۱-۲۱ شنبه‌ست
const SAT = '2026-11-21'
const WEEK = ['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']

let nextUser = 1
function makeUser(username) {
  const id = nextUser++
  db.prepare('INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)').run(id, username, 'x', Date.now())
  return { id, key: `user:${id}` }
}

// بازی آهنگ: results = نتیجه‌ی آخر هر آهنگ ('correct' یا 'lose' = ۵ حدس غلط)
function playSong(key, date, results) {
  results.forEach((_, i) => db.prepare('INSERT OR IGNORE INTO daily_songs (date, slot, song_id) VALUES (?, ?, ?)').run(date, i + 1, `s${i + 1}`))
  const insert = db.prepare('INSERT INTO guesses (session_id, date, guess_number, guess_text, result, created_at, slot) VALUES (?, ?, ?, ?, ?, ?, ?)')
  results.forEach((r, i) => {
    if (r === 'correct') insert.run(key, date, 1, 'x', 'correct', Date.now(), i + 1)
    else for (let n = 1; n <= 5; n++) insert.run(key, date, n, 'x', 'incorrect', Date.now(), i + 1)
  })
}

// جورچین: wins = چندتا از ۳ کلمه با یه حدس پیدا شده؛ بقیه «جواب رو ببینم» بعد از ۶ حدس
const WORDS = { 3: 'دست', 4: 'کتاب', 5: 'پرنده' }
function playWord(key, date, wins) {
  const insert = db.prepare('INSERT INTO word_guesses (player_key, date, length, guess_number, word, created_at) VALUES (?, ?, ?, ?, ?, ?)')
  ;[3, 4, 5].forEach((length, i) => {
    db.prepare('INSERT OR IGNORE INTO word_daily (date, length, word) VALUES (?, ?, ?)').run(date, length, WORDS[length])
    if (i < wins) insert.run(key, date, length, 1, WORDS[length], Date.now())
    else {
      for (let n = 1; n <= 6; n++) insert.run(key, date, length, n, 'غلط', Date.now())
      db.prepare('INSERT INTO word_gaveup (player_key, date, length, created_at) VALUES (?, ?, ?, ?)').run(key, date, length, Date.now())
    }
  })
}

// رنگ: offset = اختلاف رنگ‌مایه (۰ = دقیق، امتیاز ۵۰)
function playColor(key, date, offset, rounds = 5) {
  for (let r = 1; r <= 5; r++) db.prepare('INSERT OR IGNORE INTO color_daily (date, round, h, s, b) VALUES (?, ?, ?, ?, ?)').run(date, r, r * 60, 70, 70)
  for (let r = 1; r <= rounds; r++) {
    db.prepare('INSERT INTO color_guesses (player_key, date, round, h, s, b, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(key, date, r, (r * 60 + offset) % 360, 70, 70, Date.now())
  }
}

// جوربندی: words به ترتیب؛ '*' اول کلمه یعنی راهنما
function playClue(key, date, answer, words, gaveUp = false) {
  db.prepare('INSERT OR IGNORE INTO clue_daily (date, word) VALUES (?, ?)').run(date, answer)
  words.forEach((w, i) =>
    db.prepare('INSERT INTO clue_guesses (player_key, date, guess_number, word, hint, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(key, date, i + 1, w.replace('*', ''), w.startsWith('*') ? 1 : 0, Date.now())
  )
  if (gaveUp) db.prepare('INSERT INTO clue_gaveup (player_key, date, created_at) VALUES (?, ?, ?)').run(key, date, Date.now())
}

test('weekDates: شنبه تا جمعه، هر روزی از هفته باشه', () => {
  assert.deepEqual(weekDates(SAT), WEEK)
  assert.deepEqual(weekDates('2026-11-24'), WEEK)
  assert.deepEqual(weekDates('2026-11-27'), WEEK) // جمعه
  assert.equal(weekDates('2026-11-28')[0], '2026-11-28') // شنبه‌ی بعد
})

test('امتیاز هر بازی، رتبه‌ها و اینکه بازی هفته‌ی قبل یا نیمه‌تموم حساب نمی‌شه', () => {
  const ali = makeUser('ali')
  const sara = makeUser('sara')
  const reza = makeUser('reza')
  makeUser('nobody') // بازی نکرده: توی جدول نیست

  // علی
  playSong(ali.key, SAT, ['correct', 'correct', 'correct']) // ۳۰
  playSong(ali.key, '2026-11-22', ['correct', 'lose', 'correct']) // ۲۰
  playWord(ali.key, SAT, 1) // تموم ولی ۱ برد: ۱۰
  playColor(ali.key, SAT, 0) // ۵۰ امتیاز: ۳۰
  playClue(ali.key, SAT, 'دریا', ['کوه', 'دریا']) // بدون راهنما و کم: ۳۰
  playSong(ali.key, '2026-11-20', ['correct', 'correct', 'correct']) // جمعه‌ی هفته‌ی قبل: حساب نمی‌شه

  // سارا
  playWord(sara.key, SAT, 3) // ۳۰
  playClue(sara.key, '2026-11-23', 'دریا', ['*ساحل', 'دریا']) // با راهنما: ۲۰
  playClue(sara.key, '2026-11-24', 'کوه', [], true) // تسلیم بدون حدس: ۱۰
  playColor(sara.key, '2026-11-22', 0, 3) // نیمه‌تموم: ۰
  playSong(sara.key, '2026-11-23', ['correct', 'correct']) // ۲ از ۳ آهنگ: نیمه‌تموم (روز ۳ آهنگ داره)
  db.prepare("INSERT OR IGNORE INTO daily_songs (date, slot, song_id) VALUES ('2026-11-23', 3, 's3')").run()

  // رضا: همون ۶۰ امتیاز سارا تا رتبه‌ی مساوی تست بشه
  playWord(reza.key, '2026-11-25', 3) // ۳۰
  playSong(reza.key, '2026-11-25', ['lose', 'lose', 'lose']) // تموم، بدون برد: ۱۰
  playClue(reza.key, '2026-11-25', 'سیب', ['*آ', '*ب', 'سیب']) // ۲۰

  const board = getWeeklyBoard('2026-11-25', ali.id)
  assert.equal(board.weekStart, SAT)
  assert.equal(board.weekEnd, '2026-11-27')
  assert.equal(board.daysLeft, 2)
  assert.equal(board.totalPlayers, 3)
  assert.deepEqual(board.top, [
    { rank: 1, username: 'ali', points: 120, games: 5, isMe: true },
    { rank: 2, username: 'reza', points: 60, games: 3, isMe: false },
    { rank: 2, username: 'sara', points: 60, games: 3, isMe: false },
  ])
  assert.deepEqual(board.me, { rank: 1, points: 120, games: 5, song: 50, word: 10, color: 30, clue: 30 })
})

test('رنگ: برد از ۳۰ و عالی از ۴۰ امتیاز', () => {
  const u = makeUser('colorful')
  playColor(u.key, '2026-12-05', 180) // خیلی دور: فقط تموم
  const board = getWeeklyBoard('2026-12-05', u.id)
  assert.equal(board.me.color, 10)
})

test('کسی که این هفته بازی نکرده: me با امتیاز صفر و بدون رتبه؛ مهمان me نداره', () => {
  const u = makeUser('newbie')
  assert.deepEqual(getWeeklyBoard('2030-01-05', u.id).me, { rank: null, points: 0, games: 0, song: 0, word: 0, color: 0, clue: 0 })
  assert.equal(getWeeklyBoard('2030-01-05').me, null)
})

test('GET /api/weekly برای مهمان کار می‌کنه و userId لو نمی‌ره', async () => {
  const res = await fetch(`${baseUrl}/api/weekly`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.me, null)
  assert.ok(Array.isArray(body.top))
  assert.ok(!JSON.stringify(body).includes('userId'))
})
