// آمار «جورشعر» یه بازیکن (برای صفحه‌ی حساب). هیچ‌چیز جدا ذخیره نمی‌شه؛
// از روی جواب‌ها (lyrics_answers) و تیکه‌های هر روز (lyrics_daily) حساب می‌شه.
// نمره‌ی هر خط از روی متن تیکه دوباره حساب می‌شه؛ اگه تیکه‌ای از فایل داده حذف شده باشه،
// اون آهنگ «جواب‌داده» حساب می‌شه ولی توی امتیاز و خط‌ها نمیاد.
// «روز تموم‌شده» = هر ۳ آهنگ اون روز جواب داده شده. «روزهای پشت‌سرهم» = روزهای تقویمی پشت‌سرهمِ تموم‌شده
import { db } from '../../core/db.js'
import { getPuzzle } from './puzzles.js'
import { gradeLine, MAX_POINTS_PER_SONG, POINTS } from './grade.js'
import { DAILY_LYRICS_COUNT } from './daily.js'

const round1 = (n) => Math.round(n * 10) / 10
const DAY_MS = 24 * 3600 * 1000
// فاصله‌ی دو تاریخ (YYYY-MM-DD) به روز
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)

export function getLyricsStats(playerKey, today) {
  const rows = db
    .prepare(
      `SELECT a.date, a.slot, a.line1, a.line2, d.puzzle_id
       FROM lyrics_answers a LEFT JOIN lyrics_daily d ON d.date = a.date AND d.slot = a.slot
       WHERE a.player_key = ? ORDER BY a.date, a.slot`
    )
    .all(playerKey)

  const lines = { ok: 0, close: 0, wrong: 0 }
  let perfectSongs = 0
  const days = new Map() // date -> { songs, points }
  for (const r of rows) {
    if (!days.has(r.date)) days.set(r.date, { date: r.date, songs: 0, points: 0 })
    const day = days.get(r.date)
    day.songs++
    const puzzle = r.puzzle_id ? getPuzzle(r.puzzle_id) : null
    if (!puzzle) continue
    const grades = [r.line1, r.line2].map((t, i) => gradeLine(t, puzzle.lines[puzzle.answerIndex + i].text))
    const points = grades.reduce((s, g) => s + POINTS[g], 0)
    for (const g of grades) lines[g]++
    if (points === MAX_POINTS_PER_SONG) perfectSongs++
    day.points += points
  }

  const finished = [...days.values()].filter((d) => d.songs >= DAILY_LYRICS_COUNT)

  let maxStreak = 0
  let run = 0
  for (let i = 0; i < finished.length; i++) {
    run = i > 0 && daysBetween(finished[i - 1].date, finished[i].date) === 1 ? run + 1 : 1
    maxStreak = Math.max(maxStreak, run)
  }
  // رکورد فعلی: فقط اگه آخرین روز تموم‌شده امروز یا دیروز بوده هنوز زنده‌ست
  const last = finished.at(-1)
  const currentStreak = last && daysBetween(last.date, today) <= 1 ? run : 0

  return {
    songs: rows.length,
    played: finished.length,
    totalPoints: [...days.values()].reduce((s, d) => s + d.points, 0),
    averageDay: finished.length ? round1(finished.reduce((s, d) => s + d.points, 0) / finished.length) : 0,
    bestDay: finished.length ? Math.max(...finished.map((d) => d.points)) : 0,
    maxDay: DAILY_LYRICS_COUNT * MAX_POINTS_PER_SONG,
    okLines: lines.ok,
    closeLines: lines.close,
    wrongLines: lines.wrong,
    perfectSongs,
    currentStreak,
    maxStreak,
  }
}
