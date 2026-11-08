// فعالیت روزانه‌ی یه بازیکن برای تقویم صفحه‌ی حساب: هر روزی که بازی رو تموم کرده + امتیازش
import { computeScore } from './scoring.js'
import { guessesByDay } from './playerStats.js'

export const ACTIVITY_DAYS = 75 // ۱۰ هفته (۷۰ روز) + چند روز اضافه چون هفته از شنبه شروع می‌شه

// تاریخ 'YYYY-MM-DD' منهای n روز (با UTC؛ فقط حساب تقویمیه و ساعت محلی اثری نداره)
export function minusDays(dateString, n) {
  const d = new Date(`${dateString}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

// [{ date, score, won }] برای بازی‌های تموم‌شده‌ی ACTIVITY_DAYS روز اخیر، از قدیم به جدید
export function getActivity(playerKey, today, days = ACTIVITY_DAYS) {
  const from = minusDays(today, days - 1)
  const result = []
  for (const [date, guesses] of guessesByDay(playerKey)) {
    if (date < from || date > today) continue
    const score = computeScore(guesses)
    if (score === null) continue // بازی نیمه‌تموم
    result.push({ date, score, won: guesses.some((g) => g.result === 'correct') })
  }
  return result.sort((a, b) => a.date.localeCompare(b.date))
}
