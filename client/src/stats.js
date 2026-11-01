// آمار بازیکن؛ فقط توی مرورگر خودش ذخیره می‌شه (localStorage)
const KEY = 'songmore_stats'

function defaultStats() {
  return { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, lastResultDate: null }
}

export function getStats() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...defaultStats(), ...JSON.parse(raw) } : defaultStats()
  } catch {
    return defaultStats()
  }
}

function save(stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats))
  } catch {
    // لوکال‌استوریج شاید در دسترس نباشه (مثلاً حالت خصوصی)؛ مشکلی نیست
  }
}

// وقتی بازی یه روز تموم می‌شه، یه بار آمار رو آپدیت می‌کنه (بر اساس تاریخ،
// تا با هر بار رفرش صفحه دوباره حساب نشه)
export function recordResult(date, won) {
  const stats = getStats()
  if (stats.lastResultDate === date) return stats

  stats.played += 1
  if (won) {
    stats.wins += 1
    stats.currentStreak += 1
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak)
  } else {
    stats.currentStreak = 0
  }
  stats.lastResultDate = date
  save(stats)
  return stats
}
