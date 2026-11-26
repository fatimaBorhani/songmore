// مسیرهای API بازی «شعر یادت نره» (همه زیر /api/lyrics)
// هر روز ۳ تیکه آهنگ؛ بعد از هر تیکه بازیکن دو خط بعدی رو از حفظ می‌نویسه
import express from 'express'
import { getTodayDateString } from '../../core/today.js'
import { hasLyricsData } from './puzzles.js'
import { pickNewRandomLyrics } from './daily.js'
import { clearLyricsGames, getLyricsState, submitLyricsAnswer } from './game.js'
import { getLyricsStats } from './playerStats.js'

// حالت تست (همون پرچم npm run dev)
export const LYRICS_TEST_MODE = process.argv.includes('--random-song')

export const lyricsRouter = express.Router()

// آمار برای صفحه‌ی حساب (فقط کاربر واردشده). قبل از چک داده‌ست تا بدون فایل داده هم جواب بده
lyricsRouter.get('/stats', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'NOT_LOGGED_IN' })
  res.json(getLyricsStats(req.playerKey, getTodayDateString()))
})

// تا وقتی داده‌ی بازی ساخته نشده (tools/build_lyrics_game.py)، همه‌ی درخواست‌ها NO_DATA می‌گیرن
lyricsRouter.use((req, res, next) => {
  if (!hasLyricsData()) return res.status(503).json({ error: 'NO_DATA' })
  next()
})

function sendState(req, res, date) {
  res.json({ ...getLyricsState(req.playerKey, date), testMode: LYRICS_TEST_MODE })
}

lyricsRouter.get('/game', (req, res) => {
  sendState(req, res, getTodayDateString())
})

lyricsRouter.post('/answer', (req, res) => {
  const date = getTodayDateString()
  const error = submitLyricsAnswer(req.playerKey, date, req.body)
  if (error) return res.status(400).json({ error })
  sendState(req, res, date)
})

// فقط حالت تست: تیکه‌های تازه و پاک شدن جواب‌های امروز
lyricsRouter.post('/test/reset', (req, res) => {
  if (!LYRICS_TEST_MODE) return res.status(404).json({ error: 'NOT_FOUND' })
  const date = getTodayDateString()
  clearLyricsGames(date)
  pickNewRandomLyrics(date)
  sendState(req, res, date)
})
