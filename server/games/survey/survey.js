// منطق نظرسنجی «صد نفر گفتن»: سؤال‌های روز، جواب دادن، رد کردن، «۵ سؤال دیگه» و پیشنهاد سؤال.
// مهم: هیچ‌وقت جواب بقیه یا درصد جواب‌ها به کلاینت داده نمی‌شه. فقط شمارش کلی برای «هدف جمعی».
import { randomInt } from 'node:crypto'
import { db } from '../../core/db.js'
import { normalizePersian } from '../../core/normalize.js'
import {
  ANSWERS_PER_QUESTION,
  BATCH_SIZE,
  DAILY_COUNT,
  GOAL_QUESTIONS,
  MAX_ANSWER_LENGTH,
  MAX_SUGGESTION_LENGTH,
  MAX_SUGGESTIONS_PER_DAY,
  QUESTIONS,
  getQuestion,
  publicQuestion,
} from './questions.js'

// خطاهایی که API با همین کد برمی‌گردونه
export class SurveyError extends Error {}

// تعداد جواب‌های واقعی (بدون رد کردن) هر سؤال
function answerCounts() {
  const rows = db.prepare('SELECT question_id, COUNT(*) AS n FROM survey_answers WHERE answer IS NOT NULL GROUP BY question_id').all()
  return new Map(rows.map((r) => [r.question_id, r.n]))
}

// سؤال‌ها به ترتیب «کمترین جواب اول»؛ بین هم‌تعدادها تصادفی (تا سؤال‌های کم‌جواب‌تر زودتر پر بشن)
function leastAnswered(questions) {
  const counts = answerCounts()
  const shuffled = [...questions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0))
}

// سؤال‌های روزانه‌ی این تاریخ؛ بار اول انتخاب و ذخیره می‌شن (برای همه یکیه)
export function getDailyQuestionIds(date) {
  const saved = db.prepare('SELECT question_id FROM survey_daily WHERE date = ? ORDER BY position').all(date)
  if (saved.length > 0) return saved.map((r) => r.question_id)

  const picked = leastAnswered(QUESTIONS).slice(0, DAILY_COUNT)
  const insert = db.prepare('INSERT OR IGNORE INTO survey_daily (date, position, question_id) VALUES (?, ?, ?)')
  db.transaction(() => picked.forEach((q, i) => insert.run(date, i + 1, q.id)))()
  return db
    .prepare('SELECT question_id FROM survey_daily WHERE date = ? ORDER BY position')
    .all(date)
    .map((r) => r.question_id)
}

// سؤال‌هایی که این بازیکن قبلاً جواب داده یا رد کرده (هیچ‌وقت دوباره نمیان)
function handledIds(playerKey) {
  return new Set(db.prepare('SELECT question_id FROM survey_answers WHERE player_key = ?').all(playerKey).map((r) => r.question_id))
}

// سؤال‌های روز رو به بازیکن می‌دیم (فقط بار اول امروز)؛ اگه یکی‌شون رو قبلاً جواب داده، نمیاد
function ensureDailyAssigned(playerKey, date) {
  const has = db.prepare('SELECT 1 FROM survey_assign WHERE player_key = ? AND date = ? AND batch = 0 LIMIT 1').get(playerKey, date)
  if (has) return
  const handled = handledIds(playerKey)
  const ids = getDailyQuestionIds(date).filter((id) => !handled.has(id))
  const insert = db.prepare('INSERT OR IGNORE INTO survey_assign (player_key, date, question_id, position, batch) VALUES (?, ?, ?, ?, 0)')
  db.transaction(() => ids.forEach((id, i) => insert.run(playerKey, date, id, i + 1)))()
}

// هدف جمعی: چند سؤال به ۱۰۰ جواب رسیدن و تا الان چند جواب جمع شده
function goalProgress() {
  const completed = db
    .prepare('SELECT COUNT(*) AS n FROM (SELECT question_id FROM survey_answers WHERE answer IS NOT NULL GROUP BY question_id HAVING COUNT(*) >= ?)')
    .get(ANSWERS_PER_QUESTION).n
  const totalAnswers = db.prepare('SELECT COUNT(*) AS n FROM survey_answers WHERE answer IS NOT NULL').get().n
  return { completed, target: GOAL_QUESTIONS, perQuestion: ANSWERS_PER_QUESTION, totalAnswers }
}

// وضعیت نظرسنجی برای این بازیکن: سؤال جاری (فقط خودش)، پیشرفت امروز و هدف جمعی
export function getSurveyState(playerKey, date) {
  ensureDailyAssigned(playerKey, date)
  const rows = db
    .prepare(
      `SELECT a.question_id AS id, a.position, a.batch, ans.answer IS NOT NULL AS answered, ans.question_id IS NOT NULL AS handled
       FROM survey_assign a
       LEFT JOIN survey_answers ans ON ans.player_key = a.player_key AND ans.question_id = a.question_id
       WHERE a.player_key = ? AND a.date = ?
       ORDER BY a.batch, a.position`
    )
    .all(playerKey, date)
    .filter((r) => getQuestion(r.id)) // اگه سؤالی بعداً از فایل برداشته شد، دیگه نشون داده نمی‌شه

  const pending = rows.find((r) => !r.handled)
  // دسته‌ی جاری: اون که سؤال بی‌جواب داره، وگرنه آخرین دسته
  const batch = pending ? pending.batch : rows.length ? rows[rows.length - 1].batch : 0
  const batchRows = rows.filter((r) => r.batch === batch)
  const todayAnswered = rows.filter((r) => r.answered).length
  const handled = handledIds(playerKey)

  const current = pending
    ? {
        ...publicQuestion(getQuestion(pending.id)),
        number: batchRows.findIndex((r) => r.id === pending.id) + 1,
        batchSize: batchRows.length,
      }
    : null

  return {
    date,
    finished: !pending,
    batch, // ۰ = سؤال‌های روز، ۱ به بعد = «۵ سؤال دیگه»
    current,
    todayAnswered,
    canMore: !pending && QUESTIONS.some((q) => !handled.has(q.id)),
    goal: goalProgress(),
  }
}

// متن جواب رو تمیز می‌کنه؛ اگه قابل قبول نباشه کد خطا می‌ده
function cleanAnswer(text) {
  if (typeof text !== 'string') throw new SurveyError('INVALID_ANSWER')
  const answer = text.replace(/\s+/g, ' ').trim()
  if (!answer || !/\p{L}/u.test(answer) || !normalizePersian(answer)) throw new SurveyError('INVALID_ANSWER')
  if (answer.length > MAX_ANSWER_LENGTH) throw new SurveyError('ANSWER_TOO_LONG')
  return answer
}

// ثبت جواب یا رد کردن سؤال جاری (answer = null یعنی رد کردن). questionId باید همون سؤال جاری باشه
function saveCurrent(playerKey, date, questionId, answer) {
  const state = getSurveyState(playerKey, date)
  if (state.finished) throw new SurveyError('NO_PENDING')
  if (state.current.id !== questionId) throw new SurveyError('NOT_CURRENT')
  db.prepare('INSERT INTO survey_answers (player_key, question_id, answer, answer_norm, created_at) VALUES (?, ?, ?, ?, ?)').run(
    playerKey,
    questionId,
    answer,
    answer === null ? null : normalizePersian(answer),
    Date.now()
  )
  return getSurveyState(playerKey, date)
}

export function submitAnswer(playerKey, date, questionId, text) {
  return saveCurrent(playerKey, date, questionId, cleanAnswer(text))
}

export function skipQuestion(playerKey, date, questionId) {
  return saveCurrent(playerKey, date, questionId, null)
}

// «۵ سؤال دیگه»: فقط وقتی همه‌ی سؤال‌های الان تموم شدن. سؤال‌هایی میان که هنوز کمتر جواب گرفتن و این بازیکن ندیده
export function addMoreQuestions(playerKey, date) {
  const state = getSurveyState(playerKey, date)
  if (!state.finished) throw new SurveyError('PENDING_QUESTIONS')
  const handled = handledIds(playerKey)
  const picked = leastAnswered(QUESTIONS.filter((q) => !handled.has(q.id))).slice(0, BATCH_SIZE)
  if (picked.length === 0) throw new SurveyError('NO_MORE_QUESTIONS')

  const batch = (db.prepare('SELECT MAX(batch) AS b FROM survey_assign WHERE player_key = ? AND date = ?').get(playerKey, date).b ?? -1) + 1
  const insert = db.prepare('INSERT INTO survey_assign (player_key, date, question_id, position, batch) VALUES (?, ?, ?, ?, ?)')
  db.transaction(() => picked.forEach((q, i) => insert.run(playerKey, date, q.id, i + 1, batch)))()
  return getSurveyState(playerKey, date)
}

// پیشنهاد سؤال از طرف بازیکن (فقط ذخیره می‌شه؛ خودمون بعداً می‌خونیمش)
export function addSuggestion(playerKey, date, text) {
  if (typeof text !== 'string') throw new SurveyError('INVALID_SUGGESTION')
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length < 5 || clean.length > MAX_SUGGESTION_LENGTH || !/\p{L}/u.test(clean)) throw new SurveyError('INVALID_SUGGESTION')
  const today = db.prepare('SELECT COUNT(*) AS n FROM survey_suggestions WHERE player_key = ? AND date = ?').get(playerKey, date).n
  if (today >= MAX_SUGGESTIONS_PER_DAY) throw new SurveyError('TOO_MANY_SUGGESTIONS')
  db.prepare('INSERT INTO survey_suggestions (player_key, date, text, created_at) VALUES (?, ?, ?, ?)').run(playerKey, date, clean, Date.now())
}

// فقط حالت تست: جواب‌ها و سؤال‌های همین بازیکن پاک می‌شه (بقیه‌ی بازیکن‌ها دست‌نخورده)
export function clearSurveyPlayer(playerKey) {
  db.prepare('DELETE FROM survey_answers WHERE player_key = ?').run(playerKey)
  db.prepare('DELETE FROM survey_assign WHERE player_key = ?').run(playerKey)
}
