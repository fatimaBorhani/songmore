// مسیرهای API بازی واژه‌یاب (همه زیر /api/word)
// هر روز ۳ کلمه: ۳، ۴ و ۵ حرفی، یکی‌یکی؛ حدس همیشه برای کلمه‌ی جاری ثبت می‌شه
import express from 'express'
import { db } from '../../core/db.js'
import { getTodayDateString } from '../../core/today.js'
import { getDailyWords, pickNewRandomWords } from './dailyWord.js'
import { normalizeWord, validateWord } from './letters.js'
import { addWordGaveUp, addWordGuess, clearWordGames, currentIndex, getWordGameState } from './game.js'
import { getWordStats } from './playerStats.js'
import { suggestWord } from './suggestions.js'

// حالت تست (همون پرچم npm run dev): دکمه‌ی «بازی دوباره (تست)» کلمه‌های امروز رو عوض می‌کنه.
// رفرش صفحه بازی رو پاک نمی‌کنه.
export const WORD_TEST_MODE = process.argv.includes('--random-song')

export const wordRouter = express.Router()

wordRouter.get('/game', (req, res) => {
  const date = getTodayDateString()
  res.json({ ...getWordGameState(req.playerKey, date, getDailyWords(date)), testMode: WORD_TEST_MODE })
})

// آمار واژه‌یاب برای صفحه‌ی حساب (فقط کاربر واردشده، مثل آمار بازی آهنگ)
wordRouter.get('/stats', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'NOT_LOGGED_IN' })
  res.json(getWordStats(req.playerKey))
})

// «فکر می‌کنم درسته»: کلمه‌ی ردشده‌ای که بازیکن می‌گه معنی داره (فقط ذخیره می‌شه؛ مهمان هم می‌تونه)
wordRouter.post('/suggest', (req, res) => {
  const error = suggestWord(req.playerKey, getTodayDateString(), req.body?.word)
  if (error) return res.status(400).json({ error })
  res.json({ ok: true })
})

// فقط حالت تست: ۳ کلمه‌ی تصادفی جدید و پاک شدن حدس‌های امروز
wordRouter.post('/test/reset', (req, res) => {
  if (!WORD_TEST_MODE) return res.status(404).json({ error: 'NOT_FOUND' })
  const date = getTodayDateString()
  clearWordGames(date)
  res.json({ ...getWordGameState(req.playerKey, date, pickNewRandomWords(date)), testMode: true })
})

wordRouter.post('/guess', (req, res) => {
  const date = getTodayDateString()
  const daily = getDailyWords(date)
  const state = getWordGameState(req.playerKey, date, daily)
  if (state.finished) {
    return res.status(400).json({ error: 'GAME_OVER' })
  }

  const word = normalizeWord(req.body?.word)
  const error = validateWord(word, state.wordLength)
  if (error) return res.status(400).json({ error })

  const i = currentIndex(req.playerKey, date, daily)
  addWordGuess(req.playerKey, date, daily[i].length, word)
  res.json({ ...getWordGameState(req.playerKey, date, daily, i), testMode: WORD_TEST_MODE })
})

// «جواب رو ببینم»: فقط وقتی ۶ حدس تموم شده و کلمه هنوز پیدا نشده. کلمه باخت حساب می‌شه و جوابش میاد
wordRouter.post('/giveup', (req, res) => {
  const date = getTodayDateString()
  const daily = getDailyWords(date)
  const state = getWordGameState(req.playerKey, date, daily)
  if (state.finished) return res.status(400).json({ error: 'GAME_OVER' })
  if (!state.exhausted) return res.status(400).json({ error: 'GUESSES_LEFT' })

  const i = currentIndex(req.playerKey, date, daily)
  addWordGaveUp(req.playerKey, date, daily[i].length)
  res.json({ ...getWordGameState(req.playerKey, date, daily, i), testMode: WORD_TEST_MODE })
})
