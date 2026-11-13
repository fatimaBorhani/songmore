// بج‌های مشارکت در نظرسنجی. هیچ‌چیز جدا ذخیره نمی‌شه: هر بار از روی جواب‌ها و پیشنهادهای ذخیره‌شده حساب می‌شن
// (پس برای جواب‌هایی که قبلاً داده شده هم خودکار کار می‌کنه). بج امتیاز نداره؛ فقط نشون‌دهنده‌ی مشارکته.

export const EARLY_MEMBERS = 100 // «اعضای اولیه» = ۱۰۰ نفر اولی که ثبت‌نام کردن
export const MAX_SAME_ANSWER = 3 // یه جواب عین‌هم بیشتر از این‌قدر برای بج حساب نمی‌شه (تا تایپ بی‌معنی یا «الف» برای همه‌ی سؤال‌ها بج نده)

// metric: چی شمرده می‌شه (counted = جواب‌های حساب‌شده، days = روزهای مشارکت، extra = جواب به «۵ سؤال دیگه»، suggestions = سؤال‌های پیشنهادی، early = عضو اولیه)
export const BADGES = [
  { id: 'first', title: 'اولین قدم', description: 'به یه سؤال جواب بده', metric: 'counted', target: 1 },
  { id: 'q10', title: '۱۰ سؤال', description: 'به ۱۰ سؤال جواب بده', metric: 'counted', target: 10 },
  { id: 'q50', title: '۵۰ سؤال', description: 'به ۵۰ سؤال جواب بده', metric: 'counted', target: 50 },
  { id: 'q100', title: '۱۰۰ سؤال', description: 'به ۱۰۰ سؤال جواب بده', metric: 'counted', target: 100 },
  { id: 'days3', title: 'پیگیر', description: 'توی ۳ روز مختلف جواب بده', metric: 'days', target: 3 },
  { id: 'days7', title: 'همیشگی', description: 'توی ۷ روز مختلف جواب بده', metric: 'days', target: 7 },
  { id: 'more', title: 'بیشتر می‌خوام', description: 'با «۵ سؤال دیگه» ادامه بده', metric: 'extra', target: 1 },
  { id: 'suggest', title: 'سؤال‌ساز', description: 'یه سؤال پیشنهاد بده', metric: 'suggestions', target: 1 },
  { id: 'early', title: 'از اعضای اولیه', description: `جزو ${EARLY_MEMBERS} نفر اولی که توی سایت عضو شدن`, metric: 'early', target: 1, showProgress: false },
]

// metrics: { counted, days, extra, suggestions, early (۰ یا ۱) } -> [{ id, title, description, earned, progress, target, showProgress }]
export function computeBadges(metrics) {
  return BADGES.map((b) => {
    const value = metrics[b.metric] ?? 0
    return {
      id: b.id,
      title: b.title,
      description: b.description,
      earned: value >= b.target,
      progress: Math.min(value, b.target),
      target: b.target,
      showProgress: b.showProgress !== false,
    }
  })
}

// جواب‌های حساب‌شده برای بج: از هر جواب (نرمال‌شده) فقط تا MAX_SAME_ANSWER بار
export function countedAnswers(normalizedAnswers) {
  const uses = new Map()
  for (const norm of normalizedAnswers) uses.set(norm, (uses.get(norm) ?? 0) + 1)
  let total = 0
  for (const n of uses.values()) total += Math.min(n, MAX_SAME_ANSWER)
  return total
}

// شماره‌ی کاربر از کلید بازیکن ('user:12' -> 12)؛ مهمان null
export function userIdOf(playerKey) {
  const m = /^user:(\d+)$/.exec(playerKey)
  return m ? Number(m[1]) : null
}
