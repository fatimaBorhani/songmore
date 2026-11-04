// آمار بازیکن از روی حدس‌های ذخیره‌شده (همون قانون‌های آمار مرورگر: client/src/stats.js)
import { db } from './db.js'

const MAX_GUESSES = 5

export function getPlayerStats(playerKey) {
  // برای هر روز: چند تا حدس زده و درست زده یا نه
  const days = db
    .prepare(
      `SELECT date,
              COUNT(*) AS guess_count,
              MAX(result = 'correct') AS won
       FROM guesses WHERE session_id = ?
       GROUP BY date ORDER BY date`
    )
    .all(playerKey)

  let played = 0
  let wins = 0
  let currentStreak = 0
  let maxStreak = 0

  for (const day of days) {
    const finished = day.won === 1 || day.guess_count >= MAX_GUESSES
    if (!finished) continue // بازی نیمه‌تموم (مثلاً امروز) هنوز حساب نمی‌شه

    played += 1
    if (day.won === 1) {
      wins += 1
      currentStreak += 1
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return { played, wins, currentStreak, maxStreak }
}
