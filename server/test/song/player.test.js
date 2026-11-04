// تست وصل شدن بازی و آمار به حساب کاربری
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { getTodayDateString } = await import('../../games/song/dailySong.js')
const { getPlayerStats } = await import('../../games/song/playerStats.js')
const { app } = await import('../../index.js')

let server
let baseUrl

before(() => {
  seedFixture()
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
})

function seedFixture() {
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('artist-x', 'Siavash Ghomayshi', 'سیاوش قمیشی', '[]')").run()
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('artist-y', 'Ebi', 'ابی', '[]')").run()
  db.prepare("INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES ('song-A', 'Neghab', NULL, 'Siavash Ghomayshi', 'a.mp3')").run()
  db.prepare("INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES ('song-C', 'Ba To', NULL, 'Ebi', 'c.mp3')").run()
  db.prepare("INSERT INTO song_artists (song_id, artist_id, role) VALUES ('song-A', 'artist-x', 'main')").run()
  db.prepare("INSERT INTO song_artists (song_id, artist_id, role) VALUES ('song-C', 'artist-y', 'main')").run()
  for (const stage of ['0.15', '0.5', '2', '8', '15']) {
    db.prepare('INSERT INTO clips (song_id, stage, file_name) VALUES (?, ?, ?)').run('song-A', stage, `clip-${stage}.mp3`)
  }
  db.prepare('INSERT INTO daily_song (date, song_id) VALUES (?, ?)').run(getTodayDateString(), 'song-A')
}

// یه «مرورگر» ساده: کوکی‌هاش رو بین درخواست‌ها نگه می‌داره
function newBrowser() {
  const cookies = {}
  async function request(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(';')
      const [name, value] = pair.split('=')
      if (attrs.some((a) => a.trim() === 'Max-Age=0')) delete cookies[name]
      else cookies[name] = value
    }
    return { status: res.status, body: await res.json() }
  }
  return {
    game: () => request('/api/song/game').then((r) => r.body),
    guessWrong: () => request('/api/song/guess', { method: 'POST', body: { songId: 'song-C', label: 'Ba To' } }).then((r) => r.body),
    guessRight: () => request('/api/song/guess', { method: 'POST', body: { songId: 'song-A', label: 'Neghab' } }).then((r) => r.body),
    skip: () => request('/api/song/skip', { method: 'POST' }).then((r) => r.body),
    signup: (username, password) => request('/api/auth/signup', { method: 'POST', body: { username, password } }),
    login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password } }),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    stats: () => request('/api/song/stats'),
  }
}

test('مهمان نیمه‌کاره ثبت‌نام می‌کنه: بازی امروزش به حساب منتقل می‌شه', async () => {
  const browser = newBrowser()
  await browser.game()
  await browser.guessWrong()
  await browser.skip()
  assert.equal((await browser.game()).guesses.length, 2)

  const res = await browser.signup('guest_to_user', 'pass-1234')
  assert.equal(res.status, 201)

  const state = await browser.game()
  assert.equal(state.guesses.length, 2) // همون دو حدس، حالا مال حساب
  assert.equal(state.guesses[0].result, 'incorrect')
})

test('بازی کاربر روی دستگاه دیگه هم همونه', async () => {
  const laptop = newBrowser()
  await laptop.signup('two_devices', 'pass-1234')
  await laptop.game()
  await laptop.guessWrong()

  const phone = newBrowser() // مرورگر کاملاً جدا، بدون هیچ کوکی
  assert.equal((await phone.game()).guesses.length, 0) // قبل از ورود: مهمان تازه
  await phone.login('two_devices', 'pass-1234')
  const state = await phone.game()
  assert.equal(state.guesses.length, 1)
  assert.equal(state.guesses[0].result, 'incorrect')
})

test('اگه کاربر امروز بازی کرده باشه، بازی مهمان جایگزینش نمی‌شه', async () => {
  const a = newBrowser()
  await a.signup('keeps_own_game', 'pass-1234')
  await a.game()
  await a.guessRight() // کاربر امروز برده

  const b = newBrowser()
  await b.game()
  await b.guessWrong()
  await b.guessWrong() // مهمان روی یه مرورگر دیگه دو بار اشتباه زده
  await b.login('keeps_own_game', 'pass-1234')

  const state = await b.game()
  assert.equal(state.guesses.length, 1)
  assert.equal(state.guesses[0].result, 'correct')
  assert.equal(state.finished, true)
})

test('بعد از خروج، بازی حساب دیگه نشون داده نمی‌شه', async () => {
  const browser = newBrowser()
  await browser.signup('logs_out', 'pass-1234')
  await browser.game()
  await browser.guessWrong()
  await browser.logout()
  assert.equal((await browser.game()).guesses.length, 0)
})

test('/api/song/stats بدون ورود 401 میده', async () => {
  const res = await newBrowser().stats()
  assert.equal(res.status, 401)
  assert.equal(res.body.error, 'NOT_LOGGED_IN')
})

test('/api/song/stats آمار بازی امروز رو بعد از تموم شدن حساب می‌کنه', async () => {
  const browser = newBrowser()
  await browser.signup('stats_today', 'pass-1234')
  await browser.game()
  await browser.guessWrong()
  // بازی نیمه‌کاره هنوز حساب نمی‌شه
  assert.deepEqual((await browser.stats()).body.stats, {
    played: 0, wins: 0, currentStreak: 0, maxStreak: 0, totalScore: 0, bestScore: 0, averageScore: 0,
  })

  await browser.guessRight()
  // یه حدس غلط (−۱۰۰۰) بعد درست توی مرحله‌ی اول: ۹۰۰۰
  assert.deepEqual((await browser.stats()).body.stats, {
    played: 1, wins: 1, currentStreak: 1, maxStreak: 1, totalScore: 9000, bestScore: 9000, averageScore: 9000,
  })
})

test('آمار چند روزه: برد، برد، باخت، برد، و یه روز نیمه‌کاره', () => {
  const key = 'user:999'
  const insert = db.prepare(
    'INSERT INTO guesses (session_id, date, guess_number, guess_text, result) VALUES (?, ?, ?, ?, ?)'
  )
  insert.run(key, '2026-01-01', 1, 'x', 'correct') // برد
  insert.run(key, '2026-01-02', 1, 'x', 'incorrect')
  insert.run(key, '2026-01-02', 2, 'x', 'correct') // برد
  for (let i = 1; i <= 5; i++) insert.run(key, '2026-01-03', i, 'x', 'skipped') // باخت (۵ حدس)
  insert.run(key, '2026-01-04', 1, 'x', 'correct') // برد
  insert.run(key, '2026-01-05', 1, 'x', 'incorrect') // نیمه‌کاره: حساب نمی‌شه

  // امتیازها: ۱۰۰۰۰ + ۹۰۰۰ + ۰ + ۱۰۰۰۰ = ۲۹۰۰۰، میانگین ۷۲۵۰
  assert.deepEqual(getPlayerStats(key), {
    played: 4, wins: 3, currentStreak: 1, maxStreak: 2, totalScore: 29000, bestScore: 10000, averageScore: 7250,
  })
})
