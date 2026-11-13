// API نظرسنجی «صد نفر گفتن» (همه زیر /api/survey روی سرور)
import { call, postJson } from '../../shared/api.js'

export function getSurveyState() {
  return call('/api/survey/state')
}

// آمار نظرسنجی برای صفحه‌ی حساب (فقط کاربر واردشده)
export function getSurveyStats() {
  return call('/api/survey/stats')
}

export function sendAnswer(questionId, answer) {
  return postJson('/api/survey/answer', { questionId, answer })
}

export function sendSkip(questionId) {
  return postJson('/api/survey/skip', { questionId })
}

// «۵ سؤال دیگه» (فقط وقتی سؤال‌های الان تموم شدن)
export function requestMore() {
  return postJson('/api/survey/more')
}

export function sendSuggestion(text) {
  return postJson('/api/survey/suggest', { text })
}

// فقط حالت تست (npm run dev): جواب‌های خودت پاک می‌شه تا دوباره امتحان کنی
export function resetSurveyTest() {
  return postJson('/api/survey/test/reset')
}
