// تست سرتاسری: جستجو، حدس، و از همه مهم‌تر اینکه جواب هیچ‌وقت زودتر لو نره.
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

before(() => {
  seedFixture()
  server = http.createServer(app)
  server.listen(0)
  const { port } = server.address()
  baseUrl = `http://127.0.0.1:${port}`
})

after(() => {
  server.close()
})

function seedFixture() {
  db.prepare("INSERT INTO artists (id, name, persian, aliases) VALUES ('artist-x', 'Siavash Ghomayshi', 'سیاوش قمیشی', '[\"Siavash\"]')").run()
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

  // آهنگ امروز رو دستی ثابت می‌کنیم تا تست قطعی باشه (نه تصادفی)
  db.prepare('INSERT INTO daily_song (date, song_id) VALUES (?, ?)').run(getTodayDateString(), 'song-A')
}

function extractSessionCookie(res) {
  const raw = res.headers.get('set-cookie')
  if (!raw) return null
  return raw.split(';')[0]
}

test('قبل از هر حدسی، جواب لو نمی‌ره', async () => {
  const res = await fetch(`${baseUrl}/api/song/game`)
  const body = await res.json()
  const asText = JSON.stringify(body)

  assert.equal(body.finished, false)
  assert.equal('answer' in body, false)
  assert.equal(asText.includes('Neghab'), false)
  assert.equal(asText.includes('Siavash'), false)
  assert.equal(body.clips.length, 1) // فقط مرحله‌ی اول باز باشه
  assert.equal(body.guessesLeft, 5)
})

test('جستجو با اسم فارسی و alias کار می‌کنه', async () => {
  const resFa = await fetch(`${baseUrl}/api/song/search?q=${encodeURIComponent('قمیشی')}`)
  const resultsFa = await resFa.json()
  assert.equal(resultsFa.length, 2) // هر دو آهنگ سیاوش قمیشی

  const resAlias = await fetch(`${baseUrl}/api/song/search?q=Siavash`)
  const resultsAlias = await resAlias.json()
  assert.equal(resultsAlias.length, 2)
})

test('روند کامل یه بازی: present بعد incorrect بعد رد کردن تا تموم شدن', async () => {
  const first = await fetch(`${baseUrl}/api/song/game`)
  const cookie = extractSessionCookie(first)
  assert.ok(cookie, 'سرور باید کوکی نشست بده')

  const headers = { 'Content-Type': 'application/json', Cookie: cookie }

  // حدس ۱: song-B (همون خواننده، آهنگ غلط) -> present
  let res = await fetch(`${baseUrl}/api/song/guess`, {
    method: 'POST', headers, body: JSON.stringify({ songId: 'song-B', label: 'Jazireh' }),
  })
  let state = await res.json()
  assert.equal(state.guesses.at(-1).result, 'present')
  assert.equal(state.finished, false)
  assert.equal('answer' in state, false)

  // حدس ۲: song-C (خواننده‌ی غیرمرتبط) -> incorrect
  res = await fetch(`${baseUrl}/api/song/guess`, {
    method: 'POST', headers, body: JSON.stringify({ songId: 'song-C', label: 'Ba To' }),
  })
  state = await res.json()
  assert.equal(state.guesses.at(-1).result, 'incorrect')
  assert.equal('answer' in state, false)
  assert.equal(state.clips.length, 1) // حدس غلط مرحله‌ی بعد رو باز نمی‌کنه

  // رد کردن‌ها از حدس‌ها جدان: هر رد کردن یه مرحله باز می‌کنه ولی از ۵ فرصت حدس کم نمی‌کنه
  const skip = async () => (await fetch(`${baseUrl}/api/song/skip`, { method: 'POST', headers })).json()
  state = await skip()
  assert.equal(state.clips.length, 2)
  assert.equal(state.guessesLeft, 3)
  for (let i = 0; i < 3; i++) state = await skip()
  assert.equal(state.clips.length, 5) // ۴ بار رد کردن = همه‌ی مراحل باز
  assert.equal(state.skipsLeft, 0)
  assert.equal(state.guessesLeft, 3) // با ۴ تا رد کردن، فرصت‌های حدس دست‌نخورده موند
  assert.equal(state.finished, false)

  // رد کردن پنجم دیگه جایی نداره
  res = await fetch(`${baseUrl}/api/song/skip`, { method: 'POST', headers })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'NO_SKIPS_LEFT')

  // نمایش جواب: بعد از تموم شدن رد کردن‌ها مجازه، بازی با امتیاز صفر تموم می‌شه و جواب میاد
  // (روی یه بازیکن جدا، تا ادامه‌ی این تست دست نخوره)
  const other = { ...headers, Cookie: 'songmore_session=giveup-player' }
  res = await fetch(`${baseUrl}/api/song/giveup`, { method: 'POST', headers: other })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error, 'SKIPS_LEFT')
  for (let i = 0; i < 4; i++) await fetch(`${baseUrl}/api/song/skip`, { method: 'POST', headers: other })
  res = await fetch(`${baseUrl}/api/song/giveup`, { method: 'POST', headers: other })
  const gaveUp = await res.json()
  assert.equal(gaveUp.finished, true)
  assert.equal(gaveUp.score, 0)
  assert.equal(gaveUp.answer.title, 'Neghab')

  // سه حدس غلط دیگه: حدس پنجمِ واقعی بازی رو تموم می‌کنه
  for (let i = 0; i < 3; i++) {
    res = await fetch(`${baseUrl}/api/song/guess`, {
      method: 'POST', headers, body: JSON.stringify({ songId: 'song-C', label: 'Ba To' }),
    })
    state = await res.json()
  }

  assert.equal(state.finished, true)
  assert.equal(state.guesses.length, 9) // ۵ حدس + ۴ رد کردن
  assert.equal(state.guessesLeft, 0)
  assert.equal(state.answer.title, 'Neghab') // الان دیگه باید جواب بیاد
  assert.equal(state.clips.length, 5) // همه‌ی مراحل باز شده

  // بعد از تموم شدن بازی، حدس/رد کردن جدید رد می‌شه
  res = await fetch(`${baseUrl}/api/song/guess`, {
    method: 'POST', headers, body: JSON.stringify({ songId: 'song-B', label: 'x' }),
  })
  assert.equal(res.status, 400)
})

test('حدس درست بلافاصله بازی رو تموم می‌کنه و جواب رو می‌ده', async () => {
  // بدون کوکی قبلی = نشست تازه
  const first = await fetch(`${baseUrl}/api/song/game`)
  const cookie = extractSessionCookie(first)
  const headers = { 'Content-Type': 'application/json', Cookie: cookie }

  const res = await fetch(`${baseUrl}/api/song/guess`, {
    method: 'POST', headers, body: JSON.stringify({ songId: 'song-A', label: 'Neghab' }),
  })
  const state = await res.json()
  assert.equal(state.guesses.at(-1).result, 'correct')
  assert.equal(state.finished, true)
  assert.equal(state.answer.title, 'Neghab')
  assert.equal(state.guesses.length, 1) // فقط همون یه حدس، نه ۵ تا
})
