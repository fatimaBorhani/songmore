// آمار بازیکن از روی حدس‌های ذخیره‌شده (همون قانون‌های آمار مرورگر: client/src/stats.js)
import { db } from '../../core/db.js'
import { computeScore } from './scoring.js'

// همه‌ی حدس‌های یه بازیکن، روز به روز: { '2026-11-04': [حدس‌ها به ترتیب], ... }
function guessesByDay(playerKey) {
  const rows = db
    .prepare(
      'SELECT date, guess_number, result FROM guesses WHERE session_id = ? ORDER BY date, guess_number'
    )
    .all(playerKey)
  const days = new Map()
  for (const row of rows) {
    if (!days.has(row.date)) days.set(row.date, [])
    days.get(row.date).push(row)
  }
  return days
}

export function getPlayerStats(playerKey) {
  let played = 0
  let wins = 0
  let currentStreak = 0
  let maxStreak = 0
  let totalScore = 0
  let bestScore = 0

  for (const guesses of guessesByDay(playerKey).values()) {
    const score = computeScore(guesses)
    if (score === null) continue // بازی نیمه‌تموم (مثلاً امروز) هنوز حساب نمی‌شه

    played += 1
    totalScore += score
    bestScore = Math.max(bestScore, score)
    if (guesses.some((g) => g.result === 'correct')) {
      wins += 1
      currentStreak += 1
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return {
    played,
    wins,
    currentStreak,
    maxStreak,
    totalScore,
    bestScore,
    averageScore: played > 0 ? Math.round(totalScore / played) : 0,
  }
}
