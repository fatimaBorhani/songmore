// آمار حافظه‌ی رنگ یه بازیکن (برای صفحه‌ی حساب). امتیاز ذخیره نمی‌شه و از روی رنگ‌های اصلیِ همون روز و حدس‌ها دوباره حساب می‌شه.
// هر روزی که هر ۵ دور رو تموم کرده یه بازیه. «روزهای پشت‌سرهم» = روزهای تقویمیِ پشت‌سرهمی که بازی رو تموم کرده
import { db } from '../../core/db.js'
import { MAX_ROUND_SCORE, ROUNDS, scoreColor } from './scoring.js'

const round2 = (n) => Math.round(n * 100) / 100
const DAY_MS = 24 * 3600 * 1000
// فاصله‌ی دو تاریخ (YYYY-MM-DD) به روز
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)

export function getColorStats(playerKey, today) {
  const rows = db.prepare('SELECT date, round, h, s, b FROM color_guesses WHERE player_key = ? ORDER BY date, round').all(playerKey)
  const byDate = new Map()
  for (const r of rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, [])
    byDate.get(r.date).push(r)
  }

  const games = [] // { date, total, rounds: [امتیاز هر دور] }
  const targetsOf = db.prepare('SELECT round, h, s, b FROM color_daily WHERE date = ? ORDER BY round')
  for (const [date, guesses] of byDate) {
    if (guesses.length < ROUNDS) continue // بازی نیمه‌تموم هنوز حساب نمی‌شه
    const targets = targetsOf.all(date)
    if (targets.length < ROUNDS) continue
    const scores = guesses.slice(0, ROUNDS).map((g, i) => scoreColor(targets[i], g))
    games.push({ date, total: round2(scores.reduce((sum, s) => sum + s, 0)), rounds: scores })
  }
  games.sort((a, b) => (a.date < b.date ? -1 : 1))

  // روزهای تقویمیِ پشت‌سرهم
  let maxStreak = 0
  let run = 0
  for (let i = 0; i < games.length; i++) {
    run = i > 0 && daysBetween(games[i - 1].date, games[i].date) === 1 ? run + 1 : 1
    maxStreak = Math.max(maxStreak, run)
  }
  // رکورد فعلی: فقط اگه آخرین بازی امروز یا دیروز بوده هنوز زنده‌ست
  const last = games.at(-1)
  const currentStreak = last && daysBetween(last.date, today) <= 1 ? run : 0

  const allRounds = games.flatMap((g) => g.rounds)
  const totalScore = games.reduce((sum, g) => sum + g.total, 0)
  return {
    played: games.length,
    totalScore: round2(totalScore),
    averageTotal: games.length ? round2(totalScore / games.length) : 0,
    bestTotal: games.length ? Math.max(...games.map((g) => g.total)) : 0,
    averageRound: allRounds.length ? round2(allRounds.reduce((s, n) => s + n, 0) / allRounds.length) : 0,
    bestRound: allRounds.length ? Math.max(...allRounds) : 0,
    currentStreak,
    maxStreak,
    maxTotal: ROUNDS * MAX_ROUND_SCORE,
  }
}
