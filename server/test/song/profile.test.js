// تست API صفحه‌ی حساب کاربری: ورود لازمه، آمار، فعالیت تقویم و رتبه‌ی امروز
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { getTodayDateString } = await import('../../games/song/dailySong.js')
const { getActivity, minusDays } = await import('../../games/song/activity.js')
const { app } = await import('../../index.js')

let server
let baseUrl
const TODAY = getTodayDateString()

before(() => {
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('artist-x', 'Siavash Ghomayshi', 'سیاوش قمیشی', '[]')").run()
  db.prepare("INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES ('song-A', 'Neghab', NULL, 'Siavash Ghomayshi', 'a.mp3')").run()
  db.prepare("INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES ('song-C', 'Ba To', NULL, 'Ebi', 'c.mp3')").run()
  db.prepare("INSERT INTO song_artists (song_id, artist_id, role) VALUES ('song-A', 'artist-x', 'main')").run()
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
    return { status: res.status, body: await res.json() }
  }
  return {
    game: () => request('/api/song/game'),
    guess: (songId) => request('/api/song/guess', { method: 'POST', body: { songId, label: songId } }),
    signup: (username) => request('/api/auth/signup', { method: 'POST', body: { username, password: 'pass-1234' } }),
    profile: () => request('/api/song/profile'),
  }
}

test('minusDays: حساب تقویمی روز، از مرز ماه و سال رد می‌شه', () => {
  assert.equal(minusDays('2026-03-01', 1), '2026-02-28')
  assert.equal(minusDays('2026-01-01', 1), '2025-12-31')
  assert.equal(minusDays('2026-11-08', 0), '2026-11-08')
  assert.equal(minusDays('2026-11-08', 74), '2026-08-26')
})

test('مهمان پروفایل نداره (401)', async () => {
  const b = newBrowser()
  await b.game()
  const { status, body } = await b.profile()
  assert.equal(status, 401)
  assert.equal(body.error, 'NOT_LOGGED_IN')
})

test('کاربر تازه: آمار صفر، فعالیت خالی، بدون رتبه، تاریخ عضویت ISO', async () => {
  const b = newBrowser()
  await b.signup('fresh_user')
  const { status, body } = await b.profile()
  assert.equal(status, 200)
  assert.equal(body.username, 'fresh_user')
  assert.equal(body.today, TODAY)
  assert.deepEqual(body.activity, [])
  assert.equal(body.rank, null)
  assert.equal(body.stats.played, 0)
  assert.ok(!Number.isNaN(Date.parse(body.memberSince)), body.memberSince)
  assert.ok(body.memberSince.endsWith('Z'))
})

test('بعد از برد امروز: آمار، فعالیت و رتبه', async () => {
  const b = newBrowser()
  await b.signup('winner_user')
  await b.game()
  await b.guess('song-A') // ۱۰۰۰۰
  const { body } = await b.profile()
  assert.equal(body.stats.played, 1)
  assert.equal(body.stats.totalScore, 10000)
  assert.deepEqual(body.activity, [{ date: TODAY, score: 10000, won: true }])
  assert.equal(body.rank.rank >= 1, true)
  assert.equal(body.rank.totalPlayers >= 1, true)
})

test('بازی نیمه‌تموم توی فعالیت نمیاد، باخت میاد با won=false', async () => {
  const half = newBrowser()
  await half.signup('half_user')
  await half.game()
  await half.guess('song-C')
  assert.deepEqual((await half.profile()).body.activity, [])

  const loser = newBrowser()
  await loser.signup('loser_user')
  await loser.game()
  for (let i = 0; i < 5; i++) await loser.guess('song-C')
  assert.deepEqual((await loser.profile()).body.activity, [{ date: TODAY, score: 0, won: false }])
})

test('getActivity: فقط بازی‌های ۷۵ روز اخیر، مرتب از قدیم به جدید', () => {
  const key = 'user:9999'
  const add = (date, results) =>
    results.forEach((result, i) =>
      db.prepare('INSERT INTO guesses (session_id, date, guess_number, guess_text, result, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(key, date, i + 1, 'x', result, 1)
    )
  add(minusDays(TODAY, 3), ['correct'])
  add(minusDays(TODAY, 80), ['correct']) // خیلی قدیمی
  add(minusDays(TODAY, 10), ['incorrect', 'incorrect', 'incorrect', 'incorrect', 'incorrect'])
  const activity = getActivity(key, TODAY)
  assert.deepEqual(
    activity.map((a) => [a.date, a.won]),
    [[minusDays(TODAY, 10), false], [minusDays(TODAY, 3), true]]
  )
})
