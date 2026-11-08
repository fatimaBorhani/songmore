// تقویم فعالیت صفحه‌ی حساب: ۱۰ هفته که هر هفته از شنبه تا جمعه است
// همه‌ی تاریخ‌ها رشته‌ی 'YYYY-MM-DD' به وقت تهران‌ان (از سرور میان)؛ اینجا فقط حساب تقویمی می‌شه
export const WEEKS = 10

function parse(dateString) {
  return new Date(`${dateString}T12:00:00Z`)
}

export function addDays(dateString, n) {
  const d = parse(dateString)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// شنبه = ۰ ... جمعه = ۶
function weekdayFromSaturday(dateString) {
  return (parse(dateString).getUTCDay() + 1) % 7
}

// تعداد بازی‌های تموم‌شده‌ی یه روز (مسابقه‌ای + تمرینی)
export function gamesOf(day) {
  return day ? (day.daily ? 1 : 0) + day.practice : 0
}

// رنگ هر روز (مثل گیت‌هاب): ۰ بازی نشده، بعد هر چه بازی بیشتر روشن‌تر
export function levelOf(day) {
  const n = gamesOf(day)
  if (n === 0) return 0
  if (n === 1) return 1
  if (n === 2) return 2
  if (n <= 4) return 3
  return 4
}

// [{ date, level, future, day }] به ترتیب ستون‌ها (هر ۷ تا یه هفته، قدیمی‌ترین هفته اول)
export function buildCalendar(today, activity, weeks = WEEKS) {
  const byDate = new Map(activity.map((a) => [a.date, a]))
  const firstDay = addDays(today, -weekdayFromSaturday(today) - (weeks - 1) * 7)
  const cells = []
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(firstDay, i)
    const future = date > today
    const day = future ? undefined : byDate.get(date)
    cells.push({ date, future, day, level: levelOf(day) })
  }
  return { cells, activeDays: cells.filter((c) => c.day).length }
}

const dayFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', day: 'numeric', month: 'long' })
const monthFormat = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'Asia/Tehran',
  month: 'long',
  year: 'numeric',
})

// «۱۷ آبان»
export function faDay(dateString) {
  return dayFormat.format(parse(dateString))
}

// «مهر ۱۴۰۵» از زمان ISO
export function faMonthYear(iso) {
  const parts = monthFormat.formatToParts(new Date(iso))
  const get = (type) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('month')} ${get('year')}`
}
