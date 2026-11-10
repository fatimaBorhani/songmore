// تست مسابقه‌ای با ۳ آهنگ در روز: آهنگ‌ها برای همه یکیه، ترتیب، رفرش، امتیاز جمعی، جدول و آمار
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { getTodayDateString } = await import('../../games/song/dailySong.js')
const { app } = await import('../../index.js')

let server
let baseUrl
const TODAY = getTodayDateString()

before(() => {
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('artist-x', 'Siavash Ghomayshi', 'سیاوش قمیشی', '[]')").run()
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('artist-y', 'Ebi', 'ابی', '[]')").run()
  for (const [id, artist] of [['song-A', 'x'], ['song-B', 'x'], ['song-C', 'y'], ['song-D', 'y'], ['song-E', 'y']]) {
    db.prepare("INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES (?, ?, NULL, 'Someone', ?)").run(id, `Title ${id}`, `${id}.mp3`)
    db.prepare("INSERT INTO song_artists (song_id, artist_id, role) VALUES (?, ?, 'main')").run(id, `artist-${artist}`)
    for (const stage of ['0.15', '0.5', '2', '8', '15']) {
      db.prepare('INSERT INTO clips (song_id, stage, file_name) VALUES (?, ?, ?)').run(id, stage, `${id}-${stage}.mp3`)
    }
  }
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
    return { status: res.status, body: await res.json() }
  }
  return {
    game: async () => (await request('/api/song/game')).body,
    guess: async (songId) => (await request('/api/song/guess', { method: 'POST', body: { songId, label: songId } })).body,
    skip: async () => (await request('/api/song/skip', { method: 'POST' })).body,
    giveUp: async () => (await request('/api/song/giveup', { method: 'POST' })).body,
    signup: (username) => request('/api/auth/signup', { method: 'POST', body: { username, password: 'pass-1234' } }),
    leaderboard: async () => (await request('/api/song/leaderboard/today')).body,
    profile: async () => (await request('/api/song/profile')).body,
    reset: () => request('/api/song/test/reset', { method: 'POST' }),
    rawPost: async (path) => (await request(path, { method: 'POST' })).body,
    practiceGame: async () => (await request('/api/song/practice/game')).body,
    practiceNext: async () => (await request('/api/song/practice/next', { method: 'POST' })).body,
  }
}

// آهنگ‌های امروز به ترتیب (فقط خود تست از دیتابیس می‌خونه؛ API قبل از پایان بازی لو نمی‌ده)
const dailyIds = () => db.prepare('SELECT song_id FROM daily_songs WHERE date = ? ORDER BY slot').all(TODAY).map((r) => r.song_id)

test('هر روز ۳ آهنگ متفاوته و برای همه‌ی بازیکن‌ها یکیه', async () => {
  const a = newBrowser()
  const b = newBrowser()
  const stateA = await a.game()
  const stateB = await b.game()
  assert.equal(stateA.songCount, 3)
  assert.equal(stateA.slot, 1)
  assert.equal(stateB.slot, 1)
  const ids = dailyIds()
  assert.equal(ids.length, 3)
  assert.equal(new Set(ids).size, 3) // تکراری نیست
  // کلیپ آهنگ ۱ برای هر دو نفر یکیه (اسم فایل کلیپ شناسه‌ی آهنگ داره توی این تست)
  assert.equal(stateA.clips[0].file, stateB.clips[0].file)
  assert.ok(stateA.clips[0].file.startsWith(ids[0]))
  // بعد از چند بار درخواست هم عوض نمی‌شن
  await a.game()
  assert.deepEqual(dailyIds(), ids)
  // جواب هیچ آهنگی قبل از تموم شدنش نمیاد
  assert.equal('answer' in stateA, false)
  assert.deepEqual(stateA.slots.map((s) => s.finished), [false, false, false])
  assert.equal(JSON.stringify(stateA).includes('Title song'), false)
})

test('آهنگ‌ها به ترتیب‌ان و بعد از تموم شدن هر کدوم، بعدی میاد', async () => {
  const b = newBrowser()
  await b.game()
  const ids = dailyIds()

  let state = await b.guess(ids[0]) // درست توی مرحله‌ی اول
  assert.equal(state.finished, true)
  assert.equal(state.slot, 1)
  assert.equal(state.score, 10000)
  assert.equal(state.answer.title, `Title ${ids[0]}`)
  assert.equal(state.dayFinished, false)
  assert.deepEqual(state.slots.map((s) => s.finished), [true, false, false])
  assert.equal(state.dayScore, 10000)

  // رفرش: آهنگ ۲، تازه و بدون جواب
  state = await b.game()
  assert.equal(state.slot, 2)
  assert.equal(state.finished, false)
  assert.equal('answer' in state, false)
  assert.equal(state.guesses.length, 0)
  assert.ok(state.clips[0].file.startsWith(ids[1]))
  // جواب آهنگ ۱ حالا توی پیشرفت روز هست (تموم شده)، ولی آهنگ ۲ و ۳ نه
  assert.equal(state.slots[0].answer.title, `Title ${ids[0]}`)
  assert.equal('answer' in state.slots[1], false)
})

test('رفرش: حدس غلط و رد کردن می‌مونن (هر دو حالت)', async () => {
  const b = newBrowser()
  await b.game()
  const ids = dailyIds()
  const wrong = ['song-A', 'song-B', 'song-C', 'song-D', 'song-E'].find((id) => id !== ids[0])

  await b.guess(wrong)
  let state = await b.skip()
  assert.equal(state.guesses.length, 2)
  assert.equal(state.clips.length, 2)

  // «رفرش»
  state = await b.game()
  assert.equal(state.slot, 1)
  assert.equal(state.guesses.length, 2)
  assert.equal(state.clips.length, 2)
  assert.equal(state.guessesLeft, 4)
  assert.equal(state.skipsLeft, 3)
})

test('امتیاز روز جمع ۳ آهنگه، با نمایش جواب هم آهنگ تموم می‌شه، و بعد از آخری بازی تموم', async () => {
  const b = newBrowser()
  await b.signup('three_songs')
  await b.game()
  const ids = dailyIds()
  const wrong = (answer) => ['song-A', 'song-B', 'song-C', 'song-D', 'song-E'].find((id) => id !== answer)

  let state = await b.guess(ids[0]) // ۱۰۰۰۰
  state = await b.game()
  await b.skip() // ۷۵۶۴ اگه الان درست بزنه
  state = await b.guess(ids[1])
  assert.equal(state.score, 7564)
  assert.equal(state.dayFinished, false)

  // آهنگ ۳: ۴ رد کردن، بعد نمایش جواب (باخت، امتیاز ۰)
  await b.game()
  for (let i = 0; i < 4; i++) await b.skip()
  state = await b.giveUp()
  assert.equal(state.finished, true)
  assert.equal(state.score, 0)
  assert.equal(state.answer.title, `Title ${ids[2]}`)
  assert.equal(state.dayFinished, true)
  assert.equal(state.dayScore, 10000 + 7564)
  assert.deepEqual(state.slots.map((s) => s.won), [true, true, false])
  assert.equal(state.slots[2].results.at(-1), 'gaveup')

  // بعد از آخرین آهنگ حرکت جدید قبول نیست
  const again = await b.guess(wrong(ids[2]))
  assert.equal(again.error, 'GAME_OVER')

  // جدول امتیاز: جمع سه آهنگ
  const board = await b.leaderboard()
  assert.deepEqual(board.top.map((p) => [p.username, p.score]), [['three_songs', 17564]])
  assert.deepEqual(board.me, { rank: 1, score: 17564 })

  // آمار: هر آهنگ یه بازیه
  const { stats, activity } = await b.profile()
  assert.equal(stats.played, 3)
  assert.equal(stats.wins, 2)
  assert.equal(stats.bestScore, 10000)
  assert.deepEqual(activity.at(-1).daily, { score: 17564, won: true, songs: 3 })
})

test('جدول امتیاز: تا هر ۳ آهنگ تموم نشه اسم کسی نمیاد', async () => {
  const b = newBrowser()
  await b.signup('only_one_song')
  await b.game()
  const ids = dailyIds()
  await b.guess(ids[0])
  const board = await b.leaderboard()
  assert.equal(board.top.some((p) => p.username === 'only_one_song'), false)
  assert.equal(board.me, null)
})

test('دکمه‌ی تست فقط توی حالت تست کار می‌کنه', async () => {
  const b = newBrowser()
  const { status, body } = await b.reset()
  assert.equal(status, 404)
  assert.equal(body.error, 'NOT_FOUND')
})

test('تمرینی: هیچ‌وقت آهنگ‌های امروزِ مسابقه‌ای نمیاد', async () => {
  const b = newBrowser()
  const ids = dailyIds()
  const seen = new Set()
  let game = await b.practiceGame()
  for (let i = 0; i < 6; i++) {
    // آهنگ این بازی تمرینی از توی دیتابیس (جواب بازی تمرینی هم تا پایان لو نمیره)
    const row = db.prepare('SELECT song_id FROM practice_games ORDER BY id DESC LIMIT 1').get()
    seen.add(row.song_id)
    for (let k = 0; k < 4; k++) await b.rawPost('/api/song/practice/skip')
    game = await b.rawPost('/api/song/practice/giveup')
    await b.practiceNext()
  }
  for (const id of seen) assert.equal(ids.includes(id), false, `${id} آهنگ امروزه`)
  assert.ok(game)
})
