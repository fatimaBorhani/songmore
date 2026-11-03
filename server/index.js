// سرور بازی: وضعیت بازی امروز، جستجو، حدس، رد کردن.
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './db.js'
import { getTodayDateString, pickDailySong, pickNewRandomSong } from './dailySong.js'
import { searchSongs } from './search.js'
import { buildSongArtistsMap, evaluateGuess } from './guessLogic.js'
import { addGuess, getGameState } from './guesses.js'
import { getOrCreateSessionId } from './session.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const app = express()
const PORT = process.env.PORT || 3001
// حالت تست: با هر بار باز کردن صفحه، بازی از نو و با یه آهنگ تصادفی جدید شروع می‌شه
const RANDOM_SONG_MODE = process.argv.includes('--random-song')
const CLIPS_DIR = process.env.CLIPS_DIR || path.join(ROOT, 'clips')

app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204) // پیش‌درخواست CORS
  next()
})
app.use((req, res, next) => {
  req.sessionId = getOrCreateSessionId(req, res)
  next()
})

app.use('/clips', express.static(CLIPS_DIR))

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/api/game', (req, res) => {
  const date = getTodayDateString()
  let songId
  if (RANDOM_SONG_MODE) {
    // حدس‌های قبلی این بازیکن رو پاک کن و آهنگ جدید بیار
    db.prepare('DELETE FROM guesses WHERE session_id = ? AND date = ?').run(req.sessionId, date)
    songId = pickNewRandomSong(date)
  } else {
    songId = pickDailySong(date)
  }
  // testMode به کلاینت می‌گه دکمه‌ی «آهنگ بعدی» رو نشون بده
  res.json({ ...getGameState(req.sessionId, date, songId), testMode: RANDOM_SONG_MODE })
})

app.get('/api/search', (req, res) => {
  res.json(searchSongs(req.query.q || ''))
})

app.post('/api/guess', (req, res) => {
  const date = getTodayDateString()
  const songId = pickDailySong(date)
  const stateBefore = getGameState(req.sessionId, date, songId)
  if (stateBefore.finished) {
    return res.status(400).json({ error: 'GAME_OVER' })
  }

  const { songId: guessSongId, label } = req.body
  const guessSong = db.prepare('SELECT id FROM songs WHERE id = ?').get(guessSongId)
  if (!guessSongId || !guessSong) {
    return res.status(400).json({ error: 'INVALID_SONG' })
  }

  const artistsMap = buildSongArtistsMap()
  const result = evaluateGuess(guessSongId, songId, artistsMap)
  addGuess(req.sessionId, date, label || guessSong.id, result)

  res.json(getGameState(req.sessionId, date, songId))
})

app.post('/api/skip', (req, res) => {
  const date = getTodayDateString()
  const songId = pickDailySong(date)
  const stateBefore = getGameState(req.sessionId, date, songId)
  if (stateBefore.finished) {
    return res.status(400).json({ error: 'GAME_OVER' })
  }

  addGuess(req.sessionId, date, '(رد شد)', 'skipped')
  res.json(getGameState(req.sessionId, date, songId))
})

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`سرور روی پورت ${PORT} روشن شد`)
    if (RANDOM_SONG_MODE) console.log('حالت تست: هر رفرش = آهنگ جدید')
  })
}

export { app }
