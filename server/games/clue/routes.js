// مسیرهای API بازی «کلمه‌ی پنهان» (همه زیر /api/clue)
// هر روز یه کلمه؛ هر حدس یه رتبه می‌گیره که نشون می‌ده معنیش چقدر به جواب نزدیکه
import express from 'express'
import { getTodayDateString } from '../../core/today.js'
import { getDailyClue, pickNewRandomClue } from './daily.js'
import { hasClueData } from './words.js'
import { addClueGuess, addClueHint, clearClueGames, getClueState, giveUpClue } from './game.js'

// حالت تست (همون پرچم npm run dev): دکمه‌ی «بازی دوباره (تست)» کلمه‌ی امروز رو عوض می‌کنه
export const CLUE_TEST_MODE = process.argv.includes('--random-song')

export const clueRouter = express.Router()

// تا وقتی داده‌ی بازی (vectors.bin) ساخته نشده، همه‌ی درخواست‌ها خطای NO_DATA می‌گیرن
clueRouter.use((req, res, next) => {
  if (!hasClueData()) return res.status(503).json({ error: 'NO_DATA' })
  next()
})

function sendState(req, res, date, answer) {
  res.json({ ...getClueState(req.playerKey, date, answer), testMode: CLUE_TEST_MODE })
}

clueRouter.get('/game', (req, res) => {
  const date = getTodayDateString()
  sendState(req, res, date, getDailyClue(date))
})

clueRouter.post('/guess', (req, res) => {
  const date = getTodayDateString()
  const answer = getDailyClue(date)
  const error = addClueGuess(req.playerKey, date, answer, req.body?.word)
  if (error) return res.status(400).json({ error })
  sendState(req, res, date, answer)
})

clueRouter.post('/hint', (req, res) => {
  const date = getTodayDateString()
  const answer = getDailyClue(date)
  const error = addClueHint(req.playerKey, date, answer)
  if (error) return res.status(400).json({ error })
  sendState(req, res, date, answer)
})

clueRouter.post('/giveup', (req, res) => {
  const date = getTodayDateString()
  const answer = getDailyClue(date)
  const error = giveUpClue(req.playerKey, date, answer)
  if (error) return res.status(400).json({ error })
  sendState(req, res, date, answer)
})

// فقط حالت تست: کلمه‌ی تصادفی جدید و پاک شدن بازی‌های امروز
clueRouter.post('/test/reset', (req, res) => {
  if (!CLUE_TEST_MODE) return res.status(404).json({ error: 'NOT_FOUND' })
  const date = getTodayDateString()
  clearClueGames(date)
  sendState(req, res, date, pickNewRandomClue(date))
})
