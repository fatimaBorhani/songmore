// تست جدول امتیاز روزانه و امتیاز توی API بازی
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { getTodayDateString } = await import('../../games/song/dailySong.js')
const { getDailyLeaderboard } = await import('../../games/song/leaderboard.js')
const { app } = await import('../../index.js')

let server
let baseUrl
const TODAY = getTodayDateString()

before(() => {
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('artist-x', 'Siavash Ghomayshi', 'سیاوش قمیشی', '[]')").run()
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('artist-y', 'Ebi', 'ابی', '[]')").run()
  db.prepare("INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES ('song-A', 'Neghab', NULL, 'Siavash Ghomayshi', 'a.mp3')").run()
  db.prepare("INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES ('song-B', 'Jazireh', NULL, 'Siavash Ghomayshi', 'b.mp3')").run()
  db.prepare("INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES ('song-C', 'Ba To', NULL, 'Ebi', 'c.mp3')").run()
  db.prepare("INSERT INTO song_artists (song_id, artist_id, role) VALUES ('song-A', 'artist-x', 'main')").run()
  db.prepare("INSERT INTO song_artists (song_id, artist_id, role) VALUES ('song-B', 'artist-x', 'main')").run()
  db.prepare("INSERT INTO song_artists (song_id, artist_id, role) VALUES ('song-C', 'artist-y', 'main')").run()
  for (const stage of ['0.15', '0.5', '2', '8', '15']) {
    db.prepare('INSERT INTO clips (song_id, stage, file_name) VALUES (?, ?, ?)').run('song-A', stage, `clip-${stage}.mp3`)
  }
  db.prepare('INSERT INTO daily_song (date, song_id) VALUES (?, ?)').run(TODAY, 'song-A')

  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
})

// یه «مرورگر» ساده که کوکی‌هاش رو نگه می‌داره
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
      const [name, value] = c.split(';')[0].split('=')
      cookies[name] = value
    }
    return res.json()
  }
  return {
    game: () => request('/api/song/game'),
    guess: (songId) => request('/api/song/guess', { method: 'POST', body: { songId, label: songId } }),
    skip: () => request('/api/song/skip', { method: 'POST' }),
    signup: (username) => request('/api/auth/signup', { method: 'POST', body: { username, password: 'pass-1234' } }),
    leaderboard: () => request('/api/song/leaderboard/today'),
  }
}

// ---------- امتیاز توی API بازی ----------

test('وسط بازی: ارزش الان میاد، امتیاز و جواب نه', async () => {
  const b = newBrowser()
  let state = await b.game()
  assert.equal(state.worthNow, 10000)
  assert.equal(state.worthAfterSkip, 7564)
  assert.equal('score' in state, false)
  assert.equal('answer' in state, false)

  state = await b.guess('song-B') // خواننده درسته: −۵۰۰
  assert.equal(state.worthNow, 9500)
  state = await b.skip()
  assert.equal(state.worthNow, 7064)
  assert.equal(JSON.stringify(state).includes('Neghab'), false) // جواب لو نره
})

test('آخر بازی: امتیاز میاد و ارزش الان دیگه نه', async () => {
  const b = newBrowser()
  await b.game()
  await b.skip()
  const state = await b.guess('song-A')
  assert.equal(state.finished, true)
  assert.equal(state.score, 7564)
  assert.equal('worthNow' in state, false)
})

test('باخت: امتیاز صفر', async () => {
  const b = newBrowser()
  await b.game()
  let state
  for (let i = 0; i < 5; i++) state = await b.guess('song-C')
  assert.equal(state.finished, true)
  assert.equal(state.score, 0)
})

// ---------- جدول امتیاز ----------

test('جدول امتیاز: فقط کسایی که حساب دارن و تموم کردن، به ترتیب امتیاز', async () => {
  const best = newBrowser()
  await best.signup('best_player')
  await best.game()
  await best.guess('song-A') // ۱۰۰۰۰

  const second = newBrowser()
  await second.signup('second_player')
  await second.game()
  await second.guess('song-C') // غلط −۱۰۰۰
  await second.guess('song-A') // ۹۰۰۰

  const notDone = newBrowser()
  await notDone.signup('not_finished')
  await notDone.game()
  await notDone.guess('song-C') // هنوز تموم نکرده

  const guest = newBrowser() // مهمان: توی جدول نمیاد
  await guest.game()
  await guest.guess('song-A')

  const board = await second.leaderboard()
  // مهمان‌ها و بازی‌های تست قبلی (که مهمان بودن) نباید باشن
  assert.deepEqual(
    board.top.map((p) => [p.rank, p.username, p.score]),
    [
      [1, 'best_player', 10000],
      [2, 'second_player', 9000],
    ]
  )
  assert.equal(board.totalPlayers, 2)
  assert.deepEqual(board.me, { rank: 2, score: 9000 })
  assert.deepEqual(board.top.map((p) => p.isMe), [false, true])
  // شناسه‌ی کاربرها به کلاینت نمی‌ره
  assert.equal(JSON.stringify(board).includes('userId'), false)

  // کسی که وارد نشده: جدول رو می‌بینه ولی «من» نداره
  assert.equal((await guest.leaderboard()).me, null)
  // کسی که هنوز تموم نکرده: «من» نداره
  assert.equal((await notDone.leaderboard()).me, null)
})

test('امتیاز مساوی: کسی که زودتر تموم کرده بالاتره', () => {
  const date = '2026-02-01'
  const insertUser = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
  const early = insertUser.run('tie_early', 'x').lastInsertRowid
  const late = insertUser.run('tie_late', 'x').lastInsertRowid
  const insert = db.prepare(
    'INSERT INTO guesses (session_id, date, guess_number, guess_text, result, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  insert.run(`user:${late}`, date, 1, 'x', 'correct', 2000)
  insert.run(`user:${early}`, date, 1, 'x', 'correct', 1000)

  const board = getDailyLeaderboard(date, Number(late))
  assert.deepEqual(board.top.map((p) => p.username), ['tie_early', 'tie_late'])
  assert.deepEqual(board.me, { rank: 2, score: 10000 })
})
