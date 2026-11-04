// آمار مهمان؛ فقط توی مرورگر خودش ذخیره می‌شه (localStorage)
// (کاربر واردشده آمارش رو از سرور می‌گیره: GET /api/stats)
const KEY = 'songmore_stats'

function defaultStats() {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastResultDate: null,
    totalScore: 0,
    bestScore: 0,
    scoredGames: 0, // بازی‌هایی که امتیاز داشتن (بازی‌های قبل از اضافه شدن امتیاز حساب نمی‌شن)
  }
}

export function getStats() {
  try {
    const raw = localStorage.getItem(KEY)
    const stats = raw ? { ...defaultStats(), ...JSON.parse(raw) } : defaultStats()
    return withAverage(stats)
  } catch {
    return withAverage(defaultStats())
  }
}

// میانگین امتیاز فقط از بازی‌هایی که امتیاز داشتن
function withAverage(stats) {
  return {
    ...stats,
    averageScore: stats.scoredGames > 0 ? Math.round(stats.totalScore / stats.scoredGames) : 0,
  }
}

function save(stats) {
  try {
    const { averageScore: _ignored, ...rest } = stats // میانگین ذخیره نمی‌شه، هر بار حساب می‌شه
    localStorage.setItem(KEY, JSON.stringify(rest))
  } catch {
    // لوکال‌استوریج شاید در دسترس نباشه (مثلاً حالت خصوصی)؛ مشکلی نیست
  }
}

// وقتی بازی یه روز تموم می‌شه، یه بار آمار رو آپدیت می‌کنه (بر اساس تاریخ،
// تا با هر بار رفرش صفحه دوباره حساب نشه)
export function recordResult(date, won, score) {
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
  if (typeof score === 'number') {
    stats.totalScore += score
    stats.bestScore = Math.max(stats.bestScore, score)
    stats.scoredGames += 1
  }
  stats.lastResultDate = date
  save(stats)
  return withAverage(stats)
}
