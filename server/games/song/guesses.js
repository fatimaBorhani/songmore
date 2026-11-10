// ذخیره‌ی حدس‌ها و ساختن وضعیت بازی برای برگردوندن به کلاینت
import { db } from '../../core/db.js'
import { STAGES, MAX_GUESSES, MAX_SKIPS, computeScore, countRealGuesses, getWorth, isGameFinished, moveError } from './scoring.js'

// برای جاهای دیگه که STAGES رو از اینجا می‌گیرن
export { STAGES }

// حدس‌های یه آهنگ (slot) از بازی امروز این بازیکن
export function getGuesses(sessionId, date, slot) {
  return db
    .prepare(
      'SELECT guess_number, guess_text, result FROM guesses WHERE session_id = ? AND date = ? AND slot = ? ORDER BY guess_number'
    )
    .all(sessionId, date, slot)
}

// حدس جدید رو برای آهنگ slot ثبت می‌کنه؛ اگه بازیِ اون آهنگ قبلاً تموم شده بود خطا می‌ده
export function addGuess(sessionId, date, slot, guessText, result) {
  const existing = getGuesses(sessionId, date, slot)
  const error = moveError(existing, result) // GAME_OVER یا NO_SKIPS_LEFT
  if (error) throw new Error(error)
  const count = existing.length

  // created_at: زمان حدس (میلی‌ثانیه)؛ برای جدول امتیاز، وقتی امتیازها مساوی‌ان
  db.prepare(
    'INSERT INTO guesses (session_id, date, slot, guess_number, guess_text, result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(sessionId, date, slot, count + 1, guessText, result, Date.now())
}

// آهنگ جاری بازیکن: اولین آهنگی که هنوز تموم نکرده (اگه همه تموم شده، آخری).
// آهنگ بعدی تا قبلی تموم نشده باز نمی‌شه.
export function currentSlot(sessionId, date, songIds) {
  for (let slot = 1; slot <= songIds.length; slot++) {
    if (!isGameFinished(getGuesses(sessionId, date, slot))) return slot
  }
  return songIds.length
}

// وضعیت بازی امروز برای این بازیکن: آهنگ جاری (یا آهنگ forSlot) مثل قبل، به‌علاوه‌ی
// پیشرفت روز: slot (شماره‌ی آهنگ)، songCount، slots (هر آهنگ: تموم شده؟ امتیاز، نتیجه‌ها و فقط برای
// آهنگ‌های تموم‌شده جواب)، dayScore (جمع امتیاز آهنگ‌های تموم‌شده) و dayFinished.
// جواب آهنگ‌هایی که تموم نشدن هیچ‌جا نمیاد.
export function getGameState(sessionId, date, songIds, forSlot = null) {
  const slot = forSlot ?? currentSlot(sessionId, date, songIds)
  const state = buildGameState(getGuesses(sessionId, date, slot), songIds[slot - 1], { date })

  let dayScore = 0
  let dayFinished = true
  const slots = songIds.map((songId, i) => {
    const guesses = getGuesses(sessionId, date, i + 1)
    if (!isGameFinished(guesses)) {
      dayFinished = false
      return { slot: i + 1, finished: false }
    }
    const score = computeScore(guesses)
    dayScore += score
    const answer = db.prepare('SELECT title, alt_title AS altTitle, credit FROM songs WHERE id = ?').get(songId)
    return {
      slot: i + 1,
      finished: true,
      won: guesses.some((g) => g.result === 'correct'),
      score,
      results: guesses.map((g) => g.result),
      answer,
    }
  })

  return { ...state, slot, songCount: songIds.length, slots, dayScore, dayFinished }
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
