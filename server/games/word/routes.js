// مسیرهای API بازی واژه‌یاب (همه زیر /api/word)
import express from 'express'
import { getTodayDateString } from '../../core/today.js'
import { getDailyWord } from './dailyWord.js'
import { normalizeWord, validateWord } from './letters.js'
import { addWordGuess, clearWordGame, getWordGameState } from './game.js'

// حالت تست (همون پرچم npm run dev): با هر بار باز کردن صفحه، بازی امروز از اول شروع می‌شه
export const WORD_TEST_MODE = process.argv.includes('--random-song')

export const wordRouter = express.Router()

wordRouter.get('/game', (req, res) => {
  const date = getTodayDateString()
  if (WORD_TEST_MODE) clearWordGame(req.playerKey, date)
  res.json({ ...getWordGameState(req.playerKey, date, getDailyWord(date)), testMode: WORD_TEST_MODE })
})

wordRouter.post('/guess', (req, res) => {
  const date = getTodayDateString()
  const answer = getDailyWord(date)
  if (getWordGameState(req.playerKey, date, answer).finished) {
    return res.status(400).json({ error: 'GAME_OVER' })
  }

  const word = normalizeWord(req.body?.word)
  const error = validateWord(word)
  if (error) return res.status(400).json({ error })

  addWordGuess(req.playerKey, date, word)
  res.json({ ...getWordGameState(req.playerKey, date, answer), testMode: WORD_TEST_MODE })
})
