// بانک سؤال‌های نظرسنجی «صد نفر گفتن» (فایل questions.json؛ منبع و تغییرها توی NOTICE.md)
import { readFileSync } from 'node:fs'

const data = JSON.parse(readFileSync(new URL('./questions.json', import.meta.url), 'utf8'))

export const QUESTIONS = data.questions // { id, category, text, source }
const CATEGORY_LABELS = data.categories

const byId = new Map(QUESTIONS.map((q) => [q.id, q]))

export function getQuestion(id) {
  return byId.get(id) ?? null
}

// چیزی که به کلاینت میره: بدون source
export function publicQuestion(q) {
  return { id: q.id, text: q.text, category: CATEGORY_LABELS[q.category] ?? '' }
}

// تنظیم‌ها
export const DAILY_COUNT = 5 // سؤال‌های امروز: هر روز ۵ سؤال بعدی به هر بازیکن داده می‌شه
export const BATCH_SIZE = 5 // هر بار «۵ سؤال دیگه»
export const ANSWERS_PER_QUESTION = 100 // هدف: هر سؤال ۱۰۰ جواب
export const GOAL_QUESTIONS = 100 // هدف جمعی: ۱۰۰ سؤال به ۱۰۰ جواب برسه
export const MAX_ANSWER_LENGTH = 60
export const MIN_SUGGESTION_LENGTH = 10
export const MAX_SUGGESTION_LENGTH = 200
export const MAX_SUGGESTIONS_PER_DAY = 5
