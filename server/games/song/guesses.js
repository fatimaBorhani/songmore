// ذخیره‌ی حدس‌ها و ساختن وضعیت بازی برای برگردوندن به کلاینت
import { db } from '../../core/db.js'
import { STAGES, MAX_GUESSES, MAX_SKIPS, computeScore, countRealGuesses, getWorth, isGameFinished, moveError } from './scoring.js'

// برای جاهای دیگه که STAGES رو از اینجا می‌گیرن
export { STAGES }

export function getGuesses(sessionId, date) {
  return db
    .prepare(
      'SELECT guess_number, guess_text, result FROM guesses WHERE session_id = ? AND date = ? ORDER BY guess_number'
    )
    .all(sessionId, date)
}

// حدس جدید رو ثبت می‌کنه؛ اگه بازی قبلاً تموم شده بود خطا می‌ده
export function addGuess(sessionId, date, guessText, result) {
  const existing = getGuesses(sessionId, date)
  const error = moveError(existing, result) // GAME_OVER یا NO_SKIPS_LEFT
  if (error) throw new Error(error)
  const count = existing.length

  // created_at: زمان حدس (میلی‌ثانیه)؛ برای جدول امتیاز، وقتی امتیازها مساوی‌ان
  db.prepare(
    'INSERT INTO guesses (session_id, date, guess_number, guess_text, result, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(sessionId, date, count + 1, guessText, result, Date.now())
}

// وضعیت کامل بازی امروز برای این بازیکن: حدس‌ها، کلیپ‌های بازشده، و فقط اگه
// بازی تموم شده باشه (برد یا ۵ حدس) جواب هم اضافه می‌شه.
export function getGameState(sessionId, date, dailySongId) {
  return buildGameState(getGuesses(sessionId, date), dailySongId, { date })
}

// ساختن وضعیت بازی از روی لیست حدس‌ها (مشترک بین بازی مسابقه‌ای و تمرینی).
// withScore: false یعنی بدون امتیاز و «ارزش الان» (بازی تمرینی امتیاز نداره)
export function buildGameState(guesses, songId, { date, withScore = true } = {}) {
  const finished = isGameFinished(guesses)
  // فقط «رد کردن» مرحله‌ی بعد رو باز می‌کنه؛ حدس غلط زمان کلیپ رو زیاد نمی‌کنه
  const skips = guesses.filter((g) => g.result === 'skipped').length
  const unlockedCount = finished ? STAGES.length : Math.min(skips + 1, STAGES.length)

  const clipRows = db.prepare('SELECT stage, file_name FROM clips WHERE song_id = ?').all(songId)
  const clipByStage = Object.fromEntries(clipRows.map((r) => [r.stage, r.file_name]))
  const clips = STAGES.slice(0, unlockedCount).map((stage) => ({
    stage,
    file: clipByStage[String(stage)] ?? null,
  }))

  const state = {
    date,
    guesses,
    guessesLeft: MAX_GUESSES - countRealGuesses(guesses),
    skipsLeft: finished ? 0 : MAX_SKIPS - skips, // رد کردن‌ها از حدس‌ها جدا شمرده می‌شن
    finished,
    clips,
  }

  if (withScore) {
    if (finished) {
      state.score = computeScore(guesses)
    } else {
      // ارزش الان و ارزش بعد از رد کردن؛ از جواب هیچی لو نمی‌ده
      Object.assign(state, getWorth(guesses))
    }
  }

  if (finished) {
    state.answer = db
      .prepare('SELECT title, alt_title AS altTitle, credit FROM songs WHERE id = ?')
      .get(songId)
  }

  return state
}
