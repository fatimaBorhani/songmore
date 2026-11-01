// ذخیره‌ی حدس‌ها و ساختن وضعیت بازی برای برگردوندن به کلاینت
import { db } from './db.js'

export const STAGES = [0.15, 0.5, 2, 8, 15]
const MAX_GUESSES = 5

export function getGuesses(sessionId, date) {
  return db
    .prepare(
      'SELECT guess_number, guess_text, result FROM guesses WHERE session_id = ? AND date = ? ORDER BY guess_number'
    )
    .all(sessionId, date)
}

// حدس جدید رو ثبت می‌کنه؛ اگه بازی قبلاً تموم شده بود خطا می‌ده
export function addGuess(sessionId, date, guessText, result) {
  const count = db
    .prepare('SELECT COUNT(*) AS n FROM guesses WHERE session_id = ? AND date = ?')
    .get(sessionId, date).n
  if (count >= MAX_GUESSES) throw new Error('GAME_OVER')

  db.prepare(
    'INSERT INTO guesses (session_id, date, guess_number, guess_text, result) VALUES (?, ?, ?, ?, ?)'
  ).run(sessionId, date, count + 1, guessText, result)
}

// وضعیت کامل بازی امروز برای این بازیکن: حدس‌ها، کلیپ‌های بازشده، و فقط اگه
// بازی تموم شده باشه (برد یا ۵ حدس) جواب هم اضافه می‌شه.
export function getGameState(sessionId, date, dailySongId) {
  const guesses = getGuesses(sessionId, date)
  const finished = guesses.length >= MAX_GUESSES || guesses.some((g) => g.result === 'correct')
  const unlockedCount = finished ? STAGES.length : Math.min(guesses.length + 1, STAGES.length)

  const clipRows = db.prepare('SELECT stage, file_name FROM clips WHERE song_id = ?').all(dailySongId)
  const clipByStage = Object.fromEntries(clipRows.map((r) => [r.stage, r.file_name]))
  const clips = STAGES.slice(0, unlockedCount).map((stage) => ({
    stage,
    file: clipByStage[String(stage)] ?? null,
  }))

  const state = {
    guesses,
    guessesLeft: MAX_GUESSES - guesses.length,
    finished,
    clips,
  }

  if (finished) {
    state.answer = db
      .prepare('SELECT title, alt_title AS altTitle, credit FROM songs WHERE id = ?')
      .get(dailySongId)
  }

  return state
}
