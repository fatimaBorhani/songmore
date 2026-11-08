// تست بازی تمرینی: نامحدود، آهنگ تصادفی بدون تکرار، بدون امتیاز، جواب لو نمیره، فعالیت پروفایل
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { getTodayDateString } = await import('../../core/today.js')
const { app } = await import('../../index.js')

let server
let baseUrl
const TODAY = getTodayDateString()
const SONGS = ['song-A', 'song-B', 'song-C', 'song-D']
const TITLES = { 'song-A': 'Neghab', 'song-B': 'Jazireh', 'song-C': 'Ba To', 'song-D': 'Roya' }

before(() => {
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('artist-x', 'Siavash Ghomayshi', 'سیاوش قمیشی', '[]')").run()
  for (const id of SONGS) {
    db.prepare('INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES (?, ?, NULL, ?, ?)').run(id, TITLES[id], 'Someone', `${id}.mp3`)
    db.prepare("INSERT INTO song_artists (song_id, artist_id, role) VALUES (?, 'artist-x', 'main')").run(id)
    for (const stage of ['0.15', '0.5', '2', '8', '15']) {
      db.prepare('INSERT INTO clips (song_id, stage, file_name) VALUES (?, ?, ?)').run(id, stage, `${id}-${stage}.mp3`)
    }
  }
  db.prepare('INSERT INTO daily_song (date, song_id) VALUES (?, ?)').run(TODAY, 'song-A') // آهنگ امروزِ مسابقه‌ای
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
    game: () => request('/api/song/practice/game'),
    next: () => request('/api/song/practice/next', { method: 'POST' }),
    guess: (songId) => request('/api/song/practice/guess', { method: 'POST', body: { songId, label: songId } }),
    skip: () => request('/api/song/practice/skip', { method: 'POST' }),
    signup: (username) => request('/api/auth/signup', { method: 'POST', body: { username, password: 'pass-1234' } }),
    profile: () => request('/api/song/profile'),
    dailyGame: () => request('/api/song/game'),
    dailyGuess: (songId) => request('/api/song/guess', { method: 'POST', body: { songId, label: songId } }),
    leaderboard: () => request('/api/song/leaderboard/today'),
  }
}

// آهنگ بازی تمرینی فعلی این بازیکن رو از دیتابیس می‌گیره (کلاینت نباید بدونه)
function currentSong(b) {
  const row = db.prepare('SELECT song_id FROM practice_games ORDER BY id DESC LIMIT 1').get()
  return row.song_id
}

// تا بازی تموم بشه حدس غلط می‌زنه (۵ حدس)
async function loseGame(b, song) {
  const wrong = SONGS.find((s) => s !== song)
  let last
  for (let i = 0; i < 5; i++) last = await b.guess(wrong)
  return last
}

test('مهمان هم می‌تونه تمرین کنه؛ بازی تازه بدون امتیاز و جواب', async () => {
  const b = newBrowser()
  const { status, body } = await b.game()
  assert.equal(status, 200)
  assert.equal(body.finished, false)
  assert.equal(body.guessesLeft, 5)
  assert.equal(body.clips.length, 1)
  for (const key of ['score', 'worthNow', 'worthAfterSkip', 'answer']) assert.equal(key in body, false, key)
  for (const title of Object.values(TITLES)) assert.equal(JSON.stringify(body).includes(title), false)
})

test('با رفرش همون بازی می‌مونه و حدس‌ها حفظ می‌شن', async () => {
  const b = newBrowser()
  await b.game()
  const song = currentSong(b)
  await b.skip()
  const again = (await b.game()).body
  assert.equal(again.guesses.length, 1)
  assert.equal(again.clips.length, 2) // رد کردن مرحله‌ی بعد رو باز کرد
  assert.equal(currentSong(b), song)
})

test('آهنگ تمرینی هیچ‌وقت آهنگ امروزِ مسابقه‌ای نیست', async () => {
  const b = newBrowser()
  await b.game()
  for (let i = 0; i < 12; i++) {
    assert.notEqual(currentSong(b), 'song-A')
    await b.guess(currentSong(b)) // درست حدس می‌زنه تا بازی تموم بشه
    await b.next()
  }
})

test('بدون تکرار: توی هر دور همه‌ی آهنگ‌ها یه بار میان، بعد دور بعد', async () => {
  const b = newBrowser()
  await b.game()
  const seen = [currentSong(b)]
  // آهنگ امروز (song-A) کنار گذاشته می‌شه، پس ۳ آهنگ توی هر دور هست
  for (let i = 0; i < 8; i++) {
    await b.guess(currentSong(b))
    await b.next()
    seen.push(currentSong(b))
  }
  const rounds = [seen.slice(0, 3), seen.slice(3, 6), seen.slice(6, 9)]
  for (const round of rounds) assert.equal(new Set(round).size, 3, `هر دور باید ۳ آهنگ جدا باشه: ${round}`)
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1], 'پشت‌سرهم تکراری نباید باشه')
})

test('next وسط بازی نیمه‌تموم، بازی جدید نمی‌سازه', async () => {
  const b = newBrowser()
  await b.game()
  const song = currentSong(b)
  await b.skip()
  const { body } = await b.next()
  assert.equal(body.guesses.length, 1)
  assert.equal(currentSong(b), song)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM practice_games').get().n > 0, true)
})

test('برد: جواب میاد (بدون امتیاز) و حدس بعدی خطا می‌ده تا next بزنه', async () => {
  const b = newBrowser()
  await b.game()
  const song = currentSong(b)
  const { body } = await b.guess(song)
  assert.equal(body.finished, true)
  assert.equal(body.answer.title, TITLES[song])
  assert.equal('score' in body, false)
  const after = await b.guess(song)
  assert.equal(after.status, 400)
  assert.equal(after.body.error, 'GAME_OVER')
  assert.equal((await b.skip()).body.error, 'GAME_OVER')
  const fresh = (await b.next()).body
  assert.equal(fresh.finished, false)
  assert.equal(fresh.guesses.length, 0)
  assert.equal('answer' in fresh, false)
})

test('باخت بعد از ۵ حدس غلط: جواب میاد', async () => {
  const b = newBrowser()
  await b.game()
  const song = currentSong(b)
  const { body } = await loseGame(b, song)
  assert.equal(body.finished, true)
  assert.equal(body.answer.title, TITLES[song])
  assert.equal(body.guesses.length, 5)
})

test('آهنگ نامعتبر خطا می‌ده', async () => {
  const b = newBrowser()
  await b.game()
  const r = await b.guess('nope')
  assert.equal(r.status, 400)
  assert.equal(r.body.error, 'INVALID_SONG')
})

test('تمرین روی بازی مسابقه‌ای، آمار و جدول امتیاز اثری نداره', async () => {
  const b = newBrowser()
  await b.signup('practice_only')
  await b.game()
  await b.guess(currentSong(b))
  const profile = (await b.profile()).body
  assert.equal(profile.stats.played, 0)
  assert.equal(profile.stats.totalScore, 0)
  assert.equal(profile.rank, null)
  const daily = (await b.dailyGame()).body
  assert.equal(daily.guesses.length, 0)
  const board = (await b.leaderboard()).body
  assert.equal(board.top.some((p) => p.username === 'practice_only'), false)
})

test('فعالیت پروفایل: فقط بازی‌های تموم‌شده‌ی تمرینی می‌شمرن', async () => {
  const b = newBrowser()
  await b.signup('active_user')
  await b.game()
  await b.guess(currentSong(b)) // تموم شد: ۱
  await b.next()
  await b.guess(currentSong(b)) // تموم شد: ۲
  await b.next()
  await b.skip() // این یکی نیمه‌تمومه
  const profile = (await b.profile()).body
  assert.deepEqual(profile.activity, [{ date: TODAY, daily: null, practice: 2 }])
  assert.equal(profile.practiceGames, 2)
})

test('مسابقه‌ای و تمرینی با هم توی یه روز: هر دو توی فعالیت میان', async () => {
  const b = newBrowser()
  await b.signup('both_modes')
  await b.dailyGame()
  await b.dailyGuess('song-A') // مسابقه‌ای: جواب امروز، ۱۰۰۰۰
  await b.game()
  await b.guess(currentSong(b)) // تمرینی: برد
  const profile = (await b.profile()).body
  assert.deepEqual(profile.activity, [{ date: TODAY, daily: { score: 10000, won: true }, practice: 1 }])
  assert.equal(profile.stats.played, 1) // آمار فقط مسابقه‌ای
  assert.equal(profile.stats.totalScore, 10000)
})

test('بازی تمرینی مهمان با ثبت‌نام به حساب منتقل نمی‌شه', async () => {
  const b = newBrowser()
  await b.game()
  await b.guess(currentSong(b))
  await b.signup('late_signup')
  const profile = (await b.profile()).body
  assert.equal(profile.practiceGames, 0)
  assert.deepEqual(profile.activity, [])
})

test('تمرینی: رد کردن‌ها از ۵ حدس کم نمی‌کنن و رد کردن پنجم خطا می‌ده', async () => {
  const b = newBrowser()
  await b.game()
  const song = currentSong(b)
  let state
  for (let i = 0; i < 4; i++) state = (await b.skip()).body
  assert.equal(state.skipsLeft, 0)
  assert.equal(state.guessesLeft, 5)
  assert.equal(state.clips.length, 5)
  const fifth = await b.skip()
  assert.equal(fifth.status, 400)
  assert.equal(fifth.body.error, 'NO_SKIPS_LEFT')
  const wrong = SONGS.find((s) => s !== song)
  for (let i = 0; i < 4; i++) state = (await b.guess(wrong)).body
  assert.equal(state.finished, false) // ۴ حدس + ۴ رد کردن
  state = (await b.guess(wrong)).body
  assert.equal(state.finished, true)
  assert.equal(state.answer.title, TITLES[song])
})
