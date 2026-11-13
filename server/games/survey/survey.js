// منطق نظرسنجی «صد نفر گفتن»: سؤال‌های امروز، جواب دادن، رد کردن، «۵ سؤال دیگه» و پیشنهاد سؤال.
// مهم: هیچ‌وقت جواب بقیه یا درصد جواب‌ها به کلاینت داده نمی‌شه. فقط شمارش کلی برای «هدف جمعی».
import { db } from '../../core/db.js'
import { normalizePersian } from '../../core/normalize.js'
import {
  ANSWERS_PER_QUESTION,
  BATCH_SIZE,
  DAILY_COUNT,
  GOAL_QUESTIONS,
  MAX_ANSWER_LENGTH,
  MAX_SUGGESTION_LENGTH,
  MIN_SUGGESTION_LENGTH,
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

// یه ترتیب ثابت ولی «تصادفی‌نما» برای سؤال‌ها (تا وقتی تعداد جواب‌ها مساویه، دسته‌ها قاطی بیان و فقط خوراکی‌ها اول نشن)
const scramble = (id) => Number((BigInt(id) * 2654435761n) % 4294967296n)

// اولویت سؤال‌هایی که این بازیکن هنوز جواب نداده:
//  ۱) اول سؤال‌هایی که شروع شدن و هنوز به ۱۰۰ جواب نرسیدن، «نزدیک‌ترها به ۱۰۰ اول» (تا سؤال‌ها یکی‌یکی کامل بشن،
//     نه اینکه همه با هم تا ۱۰۰ نزدیک بشن و هیچ‌کدوم کامل نشه)
//  ۲) بعد سؤال‌های کامل‌شده، «کم‌جواب‌ترها اول» (باز هم داده‌ی بیشتر مفیده)
// بین مساوی‌ها همون ترتیب ثابت و تصادفی‌نما
function priorityQuestions(handled) {
  const counts = answerCounts()
  const n = (q) => counts.get(q.id) ?? 0
  const open = QUESTIONS.filter((q) => !handled.has(q.id) && n(q) < ANSWERS_PER_QUESTION)
  const done = QUESTIONS.filter((q) => !handled.has(q.id) && n(q) >= ANSWERS_PER_QUESTION)
  open.sort((a, b) => n(b) - n(a) || scramble(a.id) - scramble(b.id))
  done.sort((a, b) => n(a) - n(b) || scramble(a.id) - scramble(b.id))
  return [...open, ...done]
}

// سؤال‌هایی که این بازیکن قبلاً جواب داده یا رد کرده (هیچ‌وقت دوباره نمیان)
function handledIds(playerKey) {
  return new Set(db.prepare('SELECT question_id FROM survey_answers WHERE player_key = ?').all(playerKey).map((r) => r.question_id))
}

// سؤال‌های امروز: بار اول هر روز ۵ سؤال بعدیِ بالای اولویت (که هنوز جواب نداده) به بازیکن داده می‌شه.
// همه‌ی بازیکن‌های تازه همون سؤال‌های اول رو می‌گیرن، پس جواب‌ها روی همون‌ها جمع می‌شه
function ensureDailyAssigned(playerKey, date) {
  const has = db.prepare('SELECT 1 FROM survey_assign WHERE player_key = ? AND date = ? AND batch = 0 LIMIT 1').get(playerKey, date)
  if (has) return
  const picked = priorityQuestions(handledIds(playerKey)).slice(0, DAILY_COUNT)
  const insert = db.prepare('INSERT OR IGNORE INTO survey_assign (player_key, date, question_id, position, batch) VALUES (?, ?, ?, ?, 0)')
  db.transaction(() => picked.forEach((q, i) => insert.run(playerKey, date, q.id, i + 1)))()
}

// هدف جمعی: چند سؤال به ۱۰۰ جواب رسیدن، تا الان چند جواب جمع شده و پیشرفت کلی (۰ تا ۱)
// پیشرفت = مجموع جواب‌های ۳۰ سؤالِ جلوتر (هر کدوم حداکثر ۱۰۰) تقسیم بر ۳۰×۱۰۰، تا نوار از همون اول کمی پر بشه
function goalProgress() {
  const counts = [...answerCounts().values()].sort((a, b) => b - a)
  const completed = counts.filter((n) => n >= ANSWERS_PER_QUESTION).length
  const totalAnswers = counts.reduce((sum, n) => sum + n, 0)
  const top = counts.slice(0, GOAL_QUESTIONS).reduce((sum, n) => sum + Math.min(n, ANSWERS_PER_QUESTION), 0)
  const progress = Math.round((top / (GOAL_QUESTIONS * ANSWERS_PER_QUESTION)) * 10000) / 10000
  return { completed, target: GOAL_QUESTIONS, perQuestion: ANSWERS_PER_QUESTION, totalAnswers, progress }
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
    dailyCount: DAILY_COUNT,
    moreCount: BATCH_SIZE,
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

// «۵ سؤال دیگه»: فقط وقتی همه‌ی سؤال‌های الان تموم شدن. همون ترتیب اولویت، برای سؤال‌هایی که این بازیکن ندیده
export function addMoreQuestions(playerKey, date) {
  const state = getSurveyState(playerKey, date)
  if (!state.finished) throw new SurveyError('PENDING_QUESTIONS')
  const handled = handledIds(playerKey)
  const picked = priorityQuestions(handled).slice(0, BATCH_SIZE)
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
  if (clean.length < MIN_SUGGESTION_LENGTH || clean.length > MAX_SUGGESTION_LENGTH || !/\p{L}/u.test(clean)) throw new SurveyError('INVALID_SUGGESTION')
  const today = db.prepare('SELECT COUNT(*) AS n FROM survey_suggestions WHERE player_key = ? AND date = ?').get(playerKey, date).n
  if (today >= MAX_SUGGESTIONS_PER_DAY) throw new SurveyError('TOO_MANY_SUGGESTIONS')
  db.prepare('INSERT INTO survey_suggestions (player_key, date, text, created_at) VALUES (?, ?, ?, ?)').run(playerKey, date, clean, Date.now())
}

// فقط حالت تست: جواب‌ها و سؤال‌های همین بازیکن پاک می‌شه (بقیه‌ی بازیکن‌ها دست‌نخورده)
export function clearSurveyPlayer(playerKey) {
  db.prepare('DELETE FROM survey_answers WHERE player_key = ?').run(playerKey)
  db.prepare('DELETE FROM survey_assign WHERE player_key = ?').run(playerKey)
}
