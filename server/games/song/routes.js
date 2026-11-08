// مسیرهای API بازی حدس آهنگ (همه زیر /api/song)
import express from 'express'
import { db } from '../../core/db.js'
import { getTodayDateString, pickDailySong, pickNewRandomSong } from './dailySong.js'
import { searchSongs } from './search.js'
import { buildSongArtistsMap, evaluateGuess } from './guessLogic.js'
import { addGuess, getGameState } from './guesses.js'
import { getPlayerStats } from './playerStats.js'
import { getActivity } from './activity.js'
import { getDailyLeaderboard } from './leaderboard.js'

// حالت تست: با هر بار باز کردن صفحه، بازی از نو و با یه آهنگ تصادفی جدید شروع می‌شه
export const RANDOM_SONG_MODE = process.argv.includes('--random-song')

export const songRouter = express.Router()

songRouter.get('/game', (req, res) => {
  const date = getTodayDateString()
  let songId
  if (RANDOM_SONG_MODE) {
    // حدس‌های قبلی این بازیکن رو پاک کن و آهنگ جدید بیار
    db.prepare('DELETE FROM guesses WHERE session_id = ? AND date = ?').run(req.playerKey, date)
    songId = pickNewRandomSong(date)
  } else {
    songId = pickDailySong(date)
  }
  // testMode به کلاینت می‌گه دکمه‌ی «آهنگ بعدی» رو نشون بده
  res.json({ ...getGameState(req.playerKey, date, songId), testMode: RANDOM_SONG_MODE })
})

// آمار بازیکن واردشده (روی همه‌ی دستگاه‌هاش یکیه). مهمان‌ها آمار رو توی مرورگر نگه می‌دارن.
songRouter.get('/stats', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'NOT_LOGGED_IN' })
  res.json({ stats: getPlayerStats(req.playerKey) })
})

// جدول امتیاز امروز: ۲۰ نفر اول + رتبه‌ی خودت (اگه وارد شدی و تموم کردی)
songRouter.get('/leaderboard/today', (req, res) => {
  res.json(getDailyLeaderboard(getTodayDateString(), req.user ? req.user.id : null))
})

// صفحه‌ی حساب کاربری: آمار، فعالیت ۱۰ هفته‌ی اخیر (برای تقویم)، تاریخ عضویت و رتبه‌ی امروز
songRouter.get('/profile', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'NOT_LOGGED_IN' })
  const today = getTodayDateString()
  const board = getDailyLeaderboard(today, req.user.id)
  const row = db.prepare('SELECT created_at FROM users WHERE id = ?').get(req.user.id)
  res.json({
    today,
    username: req.user.username,
    // created_at با UTC و بدون Z ذخیره شده (مثل «2026-11-08 12:30:00»)؛ اینجا استاندارد ISO می‌شه
    memberSince: row ? `${row.created_at.replace(' ', 'T')}Z` : null,
    stats: getPlayerStats(req.playerKey),
    activity: getActivity(req.playerKey, today),
    rank: board.me ? { rank: board.me.rank, totalPlayers: board.totalPlayers } : null,
  })
})

songRouter.get('/search', (req, res) => {
  res.json(searchSongs(req.query.q || ''))
})

songRouter.post('/guess', (req, res) => {
  const date = getTodayDateString()
  const songId = pickDailySong(date)
  const stateBefore = getGameState(req.playerKey, date, songId)
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
  addGuess(req.playerKey, date, label || guessSong.id, result)

  res.json(getGameState(req.playerKey, date, songId))
})

songRouter.post('/skip', (req, res) => {
  const date = getTodayDateString()
  const songId = pickDailySong(date)
  const stateBefore = getGameState(req.playerKey, date, songId)
  if (stateBefore.finished) {
    return res.status(400).json({ error: 'GAME_OVER' })
  }

  addGuess(req.playerKey, date, '(رد شد)', 'skipped')
  res.json(getGameState(req.playerKey, date, songId))
})
