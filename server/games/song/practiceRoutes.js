// مسیرهای بازی تمرینی (همه زیر /api/song/practice): نامحدود، بدون امتیاز، برای مهمان هم کار می‌کنه
// (ولی فقط برای کاربر واردشده توی فعالیت پروفایل می‌شمره)
import express from 'express'
import { db } from '../../core/db.js'
import { getTodayDateString } from '../../core/today.js'
import { buildSongArtistsMap, evaluateGuess } from './guessLogic.js'
import { addPracticeGuess, getCurrentGame, getPracticeState, startNext } from './practice.js'

export const practiceRouter = express.Router()

practiceRouter.get('/game', (req, res) => {
  const game = getCurrentGame(req.playerKey, getTodayDateString())
  res.json(getPracticeState(game))
})

// بازی بعدی (فقط وقتی بازی فعلی تموم شده؛ وگرنه همون بازی نیمه‌تموم)
practiceRouter.post('/next', (req, res) => {
  const game = startNext(req.playerKey, getTodayDateString())
  res.json(getPracticeState(game))
})

practiceRouter.post('/guess', (req, res) => {
  const game = getCurrentGame(req.playerKey, getTodayDateString())
  if (getPracticeState(game).finished) return res.status(400).json({ error: 'GAME_OVER' })

  const { songId: guessSongId, label } = req.body || {}
  const guessSong = db.prepare('SELECT id FROM songs WHERE id = ?').get(guessSongId)
  if (!guessSongId || !guessSong) return res.status(400).json({ error: 'INVALID_SONG' })

  const result = evaluateGuess(guessSongId, game.song_id, buildSongArtistsMap())
  addPracticeGuess(game, label || guessSong.id, result)
  res.json(getPracticeState(game))
})

practiceRouter.post('/skip', (req, res) => {
  const game = getCurrentGame(req.playerKey, getTodayDateString())
  const state = getPracticeState(game)
  if (state.finished) return res.status(400).json({ error: 'GAME_OVER' })
  if (state.skipsLeft <= 0) return res.status(400).json({ error: 'NO_SKIPS_LEFT' })
  addPracticeGuess(game, '(رد شد)', 'skipped')
  res.json(getPracticeState(game))
})

// نمایش جواب (فقط وقتی رد کردن‌ها تموم شده)
practiceRouter.post('/giveup', (req, res) => {
  const game = getCurrentGame(req.playerKey, getTodayDateString())
  try {
    addPracticeGuess(game, '(نمایش جواب)', 'gaveup')
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  res.json(getPracticeState(game))
})
