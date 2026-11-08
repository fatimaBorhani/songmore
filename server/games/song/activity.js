// فعالیت روزانه‌ی یه بازیکن برای تقویم صفحه‌ی حساب (مسابقه‌ای + تمرینی)
import { computeScore } from './scoring.js'
import { guessesByDay } from './playerStats.js'
import { practiceGamesByDay } from './practice.js'

export const ACTIVITY_DAYS = 75 // ۱۰ هفته (۷۰ روز) + چند روز اضافه چون هفته از شنبه شروع می‌شه

// تاریخ 'YYYY-MM-DD' منهای n روز (با UTC؛ فقط حساب تقویمیه و ساعت محلی اثری نداره)
export function minusDays(dateString, n) {
  const d = new Date(`${dateString}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

// فعالیت هر روز، از قدیم به جدید: { date, daily: { score, won } یا null، practice: تعداد بازی تمرینی }
// فقط روزهایی که حداقل یه بازی تموم‌شده داشتن میان (بازی نیمه‌تموم حساب نمی‌شه)
export function getActivity(playerKey, today, days = ACTIVITY_DAYS) {
  const from = minusDays(today, days - 1)
  const byDate = new Map()
  const entry = (date) => {
    if (!byDate.has(date)) byDate.set(date, { date, daily: null, practice: 0 })
    return byDate.get(date)
  }

  for (const [date, guesses] of guessesByDay(playerKey)) {
    if (date < from || date > today) continue
    const score = computeScore(guesses)
    if (score === null) continue
    entry(date).daily = { score, won: guesses.some((g) => g.result === 'correct') }
  }
  for (const [date, count] of practiceGamesByDay(playerKey, from, today)) {
    entry(date).practice = count
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}
