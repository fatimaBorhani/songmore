// تست حالت تست (npm run dev = پرچم --random-song): دکمه‌های «بازی دوباره (تست)» و شروع دوباره‌ی بازی رنگ.
// بیرون از حالت تست این آدرس‌ها 404 می‌دن؛ اون رو تست‌های هر بازی چک می‌کنن.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'
const { useClueFixture } = await import('../clue/fixture.js')
useClueFixture() // داده‌ی کوچیک «کلمه‌ی پنهان» به‌جای فایل‌های واقعی
process.argv.push('--random-song') // باید قبل از import اپ باشه؛ پرچم همون موقع خونده می‌شه

const { db } = await import('../../core/db.js')
const { getTodayDateString } = await import('../../core/today.js')
const { app } = await import('../../index.js')

let server
let baseUrl
const TODAY = getTodayDateString()
const SONG_COUNT = 12

before(() => {
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('a', 'A', 'آ', '[]')").run()
  for (let i = 1; i <= SONG_COUNT; i++) {
    const id = `song-${i}`
    db.prepare('INSERT INTO songs (id, title, alt_title, credit, file_name) VALUES (?, ?, NULL, ?, ?)').run(id, `T${i}`, 'A', `${id}.mp3`)
    db.prepare("INSERT INTO song_artists (song_id, artist_id, role) VALUES (?, 'a', 'main')").run(id)
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

// یه «مرورگر» ساده که کوکی نشستش رو نگه می‌داره
function newBrowser() {
  let cookie = ''
  return async function request(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: body ? JSON.stringify(body) : undefined,
    })
    const set = res.headers.get('set-cookie')
    if (set && !cookie) cookie = set.split(';')[0]
    return { status: res.status, body: await res.json() }
  }
}

const todaySongs = () => db.prepare('SELECT song_id FROM daily_songs WHERE date = ? ORDER BY slot').all(TODAY).map((r) => r.song_id)

test('آهنگ: وضعیت بازی testMode داره و رفرش حدس‌ها رو پاک نمی‌کنه', async () => {
  const request = newBrowser()
  const first = (await request('/api/song/game')).body
  assert.equal(first.testMode, true)
  await request('/api/song/skip', { method: 'POST' })
  const again = (await request('/api/song/game')).body
  assert.equal(again.guesses.length, 1) // رفرش = همون بازی
})

test('آهنگ: «بازی دوباره (تست)» حدس‌های امروزِ همه رو پاک می‌کنه و ۳ آهنگ جدا می‌ذاره', async () => {
  const me = newBrowser()
  const other = newBrowser()
  await me('/api/song/game')
  await me('/api/song/skip', { method: 'POST' })
  await other('/api/song/game')
  await other('/api/song/skip', { method: 'POST' })

  const { status, body } = await me('/api/song/test/reset', { method: 'POST' })
  assert.equal(status, 200)
  assert.equal(body.testMode, true)
  assert.equal(body.guesses.length, 0)
  assert.equal(body.slot, 1)
  assert.equal((await other('/api/song/game')).body.guesses.length, 0)

  const songs = todaySongs()
  assert.equal(songs.length, 3)
  assert.equal(new Set(songs).size, 3) // بدون تکرار
  assert.equal('answer' in body, false) // جواب آهنگ تازه لو نره
})

test('آهنگ: چند بار «بازی دوباره» بالاخره آهنگ‌های دیگه‌ای میاره (تصادفیه)', async () => {
  const request = newBrowser()
  const seen = new Set()
  for (let i = 0; i < 8; i++) {
    await request('/api/song/test/reset', { method: 'POST' })
    seen.add(todaySongs().join(','))
  }
  assert.ok(seen.size > 1, 'از ۱۲ آهنگ، ۸ بار انتخاب نباید همیشه یکی باشه')
})

test('واژه‌یاب: «بازی دوباره (تست)» حدس‌های امروز رو پاک می‌کنه و از کلمه‌ی اول شروع می‌شه', async () => {
  const request = newBrowser()
  const game = (await request('/api/word/game')).body
  assert.equal(game.testMode, true)
  const word = db.prepare('SELECT word FROM word_daily WHERE date = ? AND length = ?').get(TODAY, game.wordLength).word
  const solved = (await request('/api/word/guess', { method: 'POST', body: { word } })).body
  assert.equal(solved.slots[0].finished, true)

  const { status, body } = await request('/api/word/test/reset', { method: 'POST' })
  assert.equal(status, 200)
  assert.equal(body.testMode, true)
  assert.equal(body.slot, 1)
  assert.equal(body.guesses.length, 0)
  assert.equal(body.slots.every((s) => !s.finished), true)
  assert.equal('answer' in body, false)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM word_daily WHERE date = ?').get(TODAY).n, 3)
})

test('رنگ: هر بار باز کردن صفحه بازی امروز رو از اول و با رنگ‌های تازه شروع می‌کنه', async () => {
  const request = newBrowser()
  const first = (await request('/api/color/game')).body
  assert.equal(first.testMode, true)
  const start = (await request('/api/color/start', { method: 'POST' })).body
  const after = (await request('/api/color/guess', { method: 'POST', body: start.color })).body
  assert.equal(after.completed, 1)
  const colorsBefore = JSON.stringify(db.prepare('SELECT h, s, b FROM color_daily WHERE date = ? ORDER BY round').all(TODAY))

  const again = (await request('/api/color/game')).body // «رفرش»
  assert.equal(again.completed, 0)
  assert.equal(again.rounds.every((r) => !r.guess), true)
  const colorsAfter = JSON.stringify(db.prepare('SELECT h, s, b FROM color_daily WHERE date = ? ORDER BY round').all(TODAY))
  assert.notEqual(colorsAfter, colorsBefore)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM color_daily WHERE date = ?').get(TODAY).n, 5)
})

test('نظرسنجی: «شروع دوباره (تست)» فقط جواب‌های خود بازیکن رو پاک می‌کنه', async () => {
  const me = newBrowser()
  const other = newBrowser()
  for (const request of [me, other]) {
    const state = (await request('/api/survey/state')).body
    assert.equal(state.testMode, true)
    await request('/api/survey/answer', { method: 'POST', body: { questionId: state.current.id, answer: 'چای' } })
  }
  assert.equal((await me('/api/survey/state')).body.todayAnswered, 1)

  const { status, body } = await me('/api/survey/test/reset', { method: 'POST' })
  assert.equal(status, 200)
  assert.equal(body.todayAnswered, 0)
  assert.equal((await other('/api/survey/state')).body.todayAnswered, 1) // مال بقیه دست نمی‌خوره
})

test('کلمه‌ی پنهان: «بازی دوباره (تست)» بازی امروز رو پاک می‌کنه', async () => {
  const request = newBrowser()
  const game = (await request('/api/clue/game')).body
  assert.equal(game.testMode, true)
  const word = db.prepare('SELECT word FROM clue_daily WHERE date = ?').get(TODAY).word
  const solved = (await request('/api/clue/guess', { method: 'POST', body: { word } })).body
  assert.equal(solved.finished, true)

  const { status, body } = await request('/api/clue/test/reset', { method: 'POST' })
  assert.equal(status, 200)
  assert.equal(body.testMode, true)
  assert.deepEqual(body.guesses, [])
  assert.equal(body.finished, false)
  assert.equal(body.answer, null)
})
