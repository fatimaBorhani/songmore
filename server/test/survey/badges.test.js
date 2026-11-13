// تست بج‌های نظرسنجی: قانون هر بج، سقف جواب تکراری، عضو اولیه و پیشرفت
import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { getTodayDateString } = await import('../../core/today.js')
const { QUESTIONS } = await import('../../games/survey/questions.js')
const { getSurveyStats } = await import('../../games/survey/survey.js')
const { BADGES, EARLY_MEMBERS, MAX_SAME_ANSWER, computeBadges, countedAnswers, userIdOf } = await import('../../games/survey/badges.js')

const today = getTodayDateString()
const DAY = 24 * 3600 * 1000
const insertAnswer = db.prepare('INSERT INTO survey_answers (player_key, question_id, answer, answer_norm, created_at) VALUES (?, ?, ?, ?, ?)')
// n جواب مختلف (به n سؤال مختلف) برای یه بازیکن؛ daysAgo = چند روز پیش جواب داده شده
function addAnswers(key, n, { offset = 0, daysAgo = 0, text = (i) => `جواب شماره ${offset + i}` } = {}) {
  for (let i = 0; i < n; i++) insertAnswer.run(key, QUESTIONS[offset + i].id, text(i), text(i).replace(/\s/g, ''), Date.now() - daysAgo * DAY)
}
const byId = (stats) => Object.fromEntries(stats.badges.map((b) => [b.id, b]))

test('بازیکن بدون جواب: هیچ بجی نداره، ولی پیشرفت و شرط همه‌ی بج‌ها هست', () => {
  const stats = getSurveyStats('user:500', today)
  assert.equal(stats.badges.length, BADGES.length)
  assert.equal(stats.badges.filter((b) => b.earned).length, 0)
  for (const b of stats.badges) {
    assert.ok(b.title && b.description && b.target >= 1)
    assert.equal(b.progress, 0)
  }
})

test('بج‌های تعداد سؤال: اولین قدم، ۱۰، ۵۰ و ۱۰۰ با پیشرفت', () => {
  addAnswers('user:501', 1)
  let badges = byId(getSurveyStats('user:501', today))
  assert.equal(badges.first.earned, true)
  assert.equal(badges.q10.earned, false)
  assert.equal(badges.q10.progress, 1)

  addAnswers('user:502', 12)
  badges = byId(getSurveyStats('user:502', today))
  assert.deepEqual([badges.first.earned, badges.q10.earned, badges.q50.earned], [true, true, false])
  assert.equal(badges.q50.progress, 12)

  addAnswers('user:503', 60)
  badges = byId(getSurveyStats('user:503', today))
  assert.deepEqual([badges.q10.earned, badges.q50.earned, badges.q100.earned], [true, true, false])
  assert.equal(badges.q100.progress, 60)
})

test('جواب تکراری: از هر جواب فقط تا ۳ بار حساب می‌شه', () => {
  addAnswers('user:504', 30, { text: () => 'الف' }) // «الف» برای ۳۰ سؤال
  const stats = getSurveyStats('user:504', today)
  assert.equal(stats.answered, 30) // آمار خام همه رو نشون می‌ده
  const badges = byId(stats)
  assert.equal(badges.first.earned, true)
  assert.equal(badges.q10.earned, false)
  assert.equal(badges.q10.progress, MAX_SAME_ANSWER)

  assert.equal(countedAnswers(['الف', 'الف', 'الف', 'الف', 'ب']), MAX_SAME_ANSWER + 1)
  assert.equal(countedAnswers([]), 0)
})

test('روزهای مشارکت: ۳ و ۷ روز مختلف؛ رد کردن حساب نمی‌شه', () => {
  for (let d = 0; d < 3; d++) addAnswers('user:505', 1, { offset: d, daysAgo: d })
  let badges = byId(getSurveyStats('user:505', today))
  assert.equal(badges.days3.earned, true)
  assert.equal(badges.days7.earned, false)
  assert.equal(badges.days7.progress, 3)

  for (let d = 0; d < 7; d++) addAnswers('user:506', 1, { offset: d, daysAgo: d })
  insertAnswer.run('user:506', QUESTIONS[20].id, null, null, Date.now() - 9 * DAY) // رد کردنِ ۹ روز پیش
  badges = byId(getSurveyStats('user:506', today))
  assert.equal(badges.days7.earned, true)
  assert.equal(getSurveyStats('user:506', today).days, 7)
})

test('«بیشتر می‌خوام»: فقط جواب به سؤال‌های «۵ سؤال دیگه» حساب می‌شه', () => {
  addAnswers('user:507', 1)
  db.prepare('INSERT INTO survey_assign (player_key, date, question_id, position, batch) VALUES (?, ?, ?, 1, 0)').run('user:507', today, QUESTIONS[0].id)
  assert.equal(byId(getSurveyStats('user:507', today)).more.earned, false)
  addAnswers('user:507', 1, { offset: 1 })
  db.prepare('INSERT INTO survey_assign (player_key, date, question_id, position, batch) VALUES (?, ?, ?, 1, 1)').run('user:507', today, QUESTIONS[1].id)
  assert.equal(byId(getSurveyStats('user:507', today)).more.earned, true)
  // سؤال دیگه‌ی batch ۱ که رد شده حساب نمی‌شه
  insertAnswer.run('user:508', QUESTIONS[2].id, null, null, Date.now())
  db.prepare('INSERT INTO survey_assign (player_key, date, question_id, position, batch) VALUES (?, ?, ?, 1, 1)').run('user:508', today, QUESTIONS[2].id)
  assert.equal(byId(getSurveyStats('user:508', today)).more.earned, false)
})

test('«سؤال‌ساز»: پیشنهاد سؤال', () => {
  assert.equal(byId(getSurveyStats('user:509', today)).suggest.earned, false)
  db.prepare('INSERT INTO survey_suggestions (player_key, date, text, created_at) VALUES (?, ?, ?, ?)').run('user:509', today, 'یه چیزی بگو که توی کوله‌ی کوهنوردی می‌ذارن', Date.now())
  assert.equal(byId(getSurveyStats('user:509', today)).suggest.earned, true)
})

test('«از اعضای اولیه»: ۱۰۰ نفر اول؛ مهمان نه', () => {
  assert.equal(byId(getSurveyStats('user:1', today)).early.earned, true)
  assert.equal(byId(getSurveyStats(`user:${EARLY_MEMBERS}`, today)).early.earned, true)
  assert.equal(byId(getSurveyStats(`user:${EARLY_MEMBERS + 1}`, today)).early.earned, false)
  assert.equal(byId(getSurveyStats('some-guest-session-id', today)).early.earned, false)
  assert.equal(byId(getSurveyStats('user:1', today)).early.showProgress, false)
  assert.equal(byId(getSurveyStats('user:1', today)).first.showProgress, true)
  assert.equal(userIdOf('user:12'), 12)
  assert.equal(userIdOf('abc'), null)
})

test('computeBadges: پیشرفت از هدف بیشتر نمی‌شه', () => {
  const badges = computeBadges({ counted: 500, days: 0, extra: 0, suggestions: 0, early: 0 })
  assert.equal(badges.find((b) => b.id === 'q100').progress, 100)
  assert.equal(badges.find((b) => b.id === 'q100').earned, true)
})

test('بج‌ها شناسه‌ی یکتا دارن و متن جواب‌ها توی خروجی نیست', () => {
  assert.equal(new Set(BADGES.map((b) => b.id)).size, BADGES.length)
  addAnswers('user:510', 3, { text: (i) => `راز‌خاص${i}` })
  const text = JSON.stringify(getSurveyStats('user:510', today))
  assert.equal(text.includes('رازخاص'), false)
  assert.equal(text.includes('راز‌خاص'), false)
})
