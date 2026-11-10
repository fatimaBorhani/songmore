// مسیرهای API بازی حدس آهنگ (همه زیر /api/song)
import express from 'express'
import { db } from '../../core/db.js'
import { getTodayDateString, pickDailySongs, pickNewRandomSongs } from './dailySong.js'
import { searchSongs } from './search.js'
import { buildSongArtistsMap, evaluateGuess } from './guessLogic.js'
import { addGuess, currentSlot, getGameState } from './guesses.js'
import { getPlayerStats } from './playerStats.js'
import { getActivity } from './activity.js'
import { practiceRouter } from './practiceRoutes.js'
import { countFinishedPracticeGames } from './practice.js'
import { getDailyLeaderboard } from './leaderboard.js'

// حالت تست (npm run dev): فقط دکمه‌ی «بازی دوباره (تست)» آهنگ‌های امروز رو عوض می‌کنه؛
// رفرش صفحه بازی رو پاک نمی‌کنه
export const RANDOM_SONG_MODE = process.argv.includes('--random-song')

export const songRouter = express.Router()

// بازی تمرینی: /api/song/practice/...
songRouter.use('/practice', practiceRouter)

// بازی امروز: آهنگ جاری (اولین آهنگی که هنوز تموم نکردی) + پیشرفت روز
songRouter.get('/game', (req, res) => {
  const date = getTodayDateString()
  const songIds = pickDailySongs(date)
  // testMode به کلاینت می‌گه دکمه‌ی «بازی دوباره (تست)» رو نشون بده
  res.json({ ...getGameState(req.playerKey, date, songIds), testMode: RANDOM_SONG_MODE })
})

// فقط حالت تست: ۳ آهنگ تصادفی جدید برای امروز و پاک شدن حدس‌های امروز
songRouter.post('/test/reset', (req, res) => {
  if (!RANDOM_SONG_MODE) return res.status(404).json({ error: 'NOT_FOUND' })
  const date = getTodayDateString()
  db.prepare('DELETE FROM guesses WHERE date = ?').run(date)
  const songIds = pickNewRandomSongs(date)
  res.json({ ...getGameState(req.playerKey, date, songIds), testMode: true })
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
    practiceGames: countFinishedPracticeGames(req.playerKey),
    rank: board.me ? { rank: board.me.rank, totalPlayers: board.totalPlayers } : null,
  })
})

songRouter.get('/search', (req, res) => {
  res.json(searchSongs(req.query.q || ''))
})

// هر حرکت (حدس، رد کردن، نمایش جواب) روی آهنگ جاری انجام می‌شه
function playContext(req) {
  const date = getTodayDateString()
  const songIds = pickDailySongs(date)
  const slot = currentSlot(req.playerKey, date, songIds)
  return { date, songIds, slot, songId: songIds[slot - 1], state: getGameState(req.playerKey, date, songIds, slot) }
}

songRouter.post('/guess', (req, res) => {
  const { date, songIds, slot, songId, state } = playContext(req)
  if (state.finished) {
    return res.status(400).json({ error: 'GAME_OVER' })
  }

  const { songId: guessSongId, label } = req.body
  const guessSong = db.prepare('SELECT id FROM songs WHERE id = ?').get(guessSongId)
  if (!guessSongId || !guessSong) {
    return res.status(400).json({ error: 'INVALID_SONG' })
  }

  const artistsMap = buildSongArtistsMap()
  const result = evaluateGuess(guessSongId, songId, artistsMap)
  addGuess(req.playerKey, date, slot, label || guessSong.id, result)

  res.json(getGameState(req.playerKey, date, songIds, slot))
})

songRouter.post('/skip', (req, res) => {
  const { date, songIds, slot, state } = playContext(req)
  if (state.finished) {
    return res.status(400).json({ error: 'GAME_OVER' })
  }

  if (state.skipsLeft <= 0) {
    return res.status(400).json({ error: 'NO_SKIPS_LEFT' })
  }

  addGuess(req.playerKey, date, slot, '(رد شد)', 'skipped')
  res.json(getGameState(req.playerKey, date, songIds, slot))
})

// نمایش جواب: فقط وقتی همه‌ی رد کردن‌ها تموم شده؛ بازی اون آهنگ با باخت تموم می‌شه
songRouter.post('/giveup', (req, res) => {
  const { date, songIds, slot } = playContext(req)
  try {
    addGuess(req.playerKey, date, slot, '(نمایش جواب)', 'gaveup')
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  res.json(getGameState(req.playerKey, date, songIds, slot))
})
