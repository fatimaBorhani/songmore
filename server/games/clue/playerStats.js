// آمار «کلمه‌ی پنهان» یه بازیکن (برای صفحه‌ی حساب). هیچ‌چیز جدا ذخیره نمی‌شه؛ از روی حدس‌ها و تسلیم‌ها حساب می‌شه.
// «پیدا شده» = یکی از حدس‌های اون روز (بدون راهنما) خود کلمه‌ی اون روز بوده؛ پس به vectors.bin نیازی نداره.
// هر روزی که پیدا شده یا تسلیم شده یه بازیه (بازی نیمه‌تموم حساب نمی‌شه).
// «روزهای پشت‌سرهم» = روزهای تقویمیِ پشت‌سرهمی که کلمه رو پیدا کرده
import { db } from '../../core/db.js'

const round1 = (n) => Math.round(n * 10) / 10
const DAY_MS = 24 * 3600 * 1000
// فاصله‌ی دو تاریخ (YYYY-MM-DD) به روز
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)

export function getClueStats(playerKey, today) {
  const rows = db
    .prepare(
      `SELECT g.date, g.word, g.hint, d.word AS answer
       FROM clue_guesses g LEFT JOIN clue_daily d ON d.date = g.date
       WHERE g.player_key = ? ORDER BY g.date, g.guess_number`
    )
    .all(playerKey)
  const gaveUp = new Set(
    db.prepare('SELECT date FROM clue_gaveup WHERE player_key = ?').all(playerKey).map((r) => r.date)
  )

  // هر روز: تعداد حدس‌ها و راهنماها و اینکه پیدا شده یا نه
  const days = new Map()
  for (const r of rows) {
    if (!days.has(r.date)) days.set(r.date, { date: r.date, guesses: 0, hints: 0, found: false })
    const day = days.get(r.date)
    if (r.hint) day.hints++
    else day.guesses++
    if (!r.hint && r.word === r.answer) day.found = true
  }
  for (const date of gaveUp) if (!days.has(date)) days.set(date, { date, guesses: 0, hints: 0, found: false })

  const games = [...days.values()].filter((d) => d.found || gaveUp.has(d.date)).sort((a, b) => (a.date < b.date ? -1 : 1))
  const wins = games.filter((g) => g.found)

  // روزهای پشت‌سرهمی که پیدا کرده
  let maxStreak = 0
  let run = 0
  for (let i = 0; i < wins.length; i++) {
    run = i > 0 && daysBetween(wins[i - 1].date, wins[i].date) === 1 ? run + 1 : 1
    maxStreak = Math.max(maxStreak, run)
  }
  // رکورد فعلی: فقط اگه آخرین پیدا کردن امروز یا دیروز بوده هنوز زنده‌ست
  const last = wins.at(-1)
  const currentStreak = last && daysBetween(last.date, today) <= 1 ? run : 0

  return {
    played: games.length,
    wins: wins.length,
    gaveUps: games.length - wins.length,
    averageGuesses: wins.length ? round1(wins.reduce((s, g) => s + g.guesses, 0) / wins.length) : 0,
    bestGuesses: wins.length ? Math.min(...wins.map((g) => g.guesses)) : 0,
    totalHints: games.reduce((s, g) => s + g.hints, 0),
    noHintWins: wins.filter((g) => g.hints === 0).length,
    currentStreak,
    maxStreak,
  }
}
