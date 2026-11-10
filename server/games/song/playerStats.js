// آمار بازیکن از روی حدس‌های ذخیره‌شده (همون قانون‌های آمار مرورگر: client/src/stats.js)
import { db } from '../../core/db.js'
import { computeScore } from './scoring.js'

// همه‌ی حدس‌های یه بازیکن، روز به روز: { '2026-11-04': [حدس‌های آهنگ ۱, حدس‌های آهنگ ۲, ...], ... }
// (برای هر آهنگِ اون روز یه آرایه، به ترتیب شماره‌ی آهنگ؛ آهنگ‌هایی که هنوز حدس نخوردن نمیان)
export function guessesByDay(playerKey) {
  const rows = db
    .prepare(
      'SELECT date, slot, guess_number, result FROM guesses WHERE session_id = ? ORDER BY date, slot, guess_number'
    )
    .all(playerKey)
  const days = new Map()
  for (const row of rows) {
    if (!days.has(row.date)) days.set(row.date, new Map())
    const slots = days.get(row.date)
    if (!slots.has(row.slot)) slots.set(row.slot, [])
    slots.get(row.slot).push(row)
  }
  return new Map([...days].map(([date, slots]) => [date, [...slots.values()]]))
}

// هر آهنگِ تموم‌شده یه بازیه (آهنگ نیمه‌تموم هنوز حساب نمی‌شه). «پیاپی» = روزهای پشت‌سرهمی
// که حداقل یه آهنگ رو درست زدی؛ روزی که همه‌ی آهنگ‌های تموم‌شده‌ش غلط بود پیاپی رو صفر می‌کنه.
export function getPlayerStats(playerKey) {
  let played = 0
  let wins = 0
  let currentStreak = 0
  let maxStreak = 0
  let totalScore = 0
  let bestScore = 0

  for (const songs of guessesByDay(playerKey).values()) {
    let dayPlayed = 0
    let dayWon = false
    for (const guesses of songs) {
      const score = computeScore(guesses)
      if (score === null) continue
      dayPlayed += 1
      totalScore += score
      bestScore = Math.max(bestScore, score)
      if (guesses.some((g) => g.result === 'correct')) {
        wins += 1
        dayWon = true
      }
    }
    if (dayPlayed === 0) continue
    played += dayPlayed
    if (dayWon) {
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
