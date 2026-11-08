// مسیرهای API بازی حافظه‌ی رنگ (همه زیر /api/color)
import express from 'express'
import { getTodayDateString } from '../../core/today.js'
import { regenerateDailyColors } from './daily.js'
import { addColorGuess, clearColorGame, getColorState, getCurrentRoundColor, parseColorInput } from './game.js'

// حالت تست (همون پرچم npm run dev): با هر بار باز کردن صفحه، بازی امروز از اول و با رنگ‌های تازه شروع می‌شه
export const COLOR_TEST_MODE = process.argv.includes('--random-song')

export const colorRouter = express.Router()

colorRouter.get('/game', (req, res) => {
  const date = getTodayDateString()
  if (COLOR_TEST_MODE) {
    clearColorGame(req.playerKey, date)
    regenerateDailyColors(date)
  }
  res.json({ ...getColorState(req.playerKey, date), testMode: COLOR_TEST_MODE })
})

// شروع یه دور: رنگی که باید حفظ بشه (فقط رنگ دور جاری)
colorRouter.post('/start', (req, res) => {
  const current = getCurrentRoundColor(req.playerKey, getTodayDateString())
  if (!current) return res.status(400).json({ error: 'GAME_OVER' })
  res.json(current)
})

colorRouter.post('/guess', (req, res) => {
  const date = getTodayDateString()
  if (getColorState(req.playerKey, date).finished) return res.status(400).json({ error: 'GAME_OVER' })

  const color = parseColorInput(req.body)
  if (!color) return res.status(400).json({ error: 'INVALID_COLOR' })

  addColorGuess(req.playerKey, date, color)
  res.json({ ...getColorState(req.playerKey, date), testMode: COLOR_TEST_MODE })
})
