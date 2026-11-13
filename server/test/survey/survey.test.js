// تست سرتاسری نظرسنجی «صد نفر گفتن»: سؤال‌های روز، جواب دادن، رد کردن، «۵ سؤال دیگه»، پیشنهاد، هدف جمعی و نشت نکردن جواب‌ها
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.DB_PATH = ':memory:'
process.env.NODE_ENV = 'test'

const { db } = await import('../../core/db.js')
const { app } = await import('../../index.js')
const { getTodayDateString } = await import('../../core/today.js')
const { QUESTIONS, DAILY_COUNT, BATCH_SIZE, ANSWERS_PER_QUESTION, MAX_ANSWER_LENGTH, MAX_SUGGESTIONS_PER_DAY } = await import('../../games/survey/questions.js')

let server
let baseUrl

before(() => {
  server = http.createServer(app)
  server.listen(0)
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => {
  server.close()
})

// هر «بازیکن» یه مرورگر جداست با کوکی خودش
async function newPlayer() {
  const res = await fetch(`${baseUrl}/api/survey/state`)
  const cookie = res.headers.get('set-cookie').split(';')[0]
  return { cookie, state: await res.json() }
}

async function post(cookie, path, body) {
  const res = await fetch(`${baseUrl}/api/survey/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body ?? {}),
  })
  return { status: res.status, body: await res.json() }
}

async function getState(cookie) {
  return (await fetch(`${baseUrl}/api/survey/state`, { headers: { Cookie: cookie } })).json()
}

// به سؤال جاری جواب می‌ده
async function answerCurrent(cookie, answer = 'جواب آزمایشی') {
  const state = await getState(cookie)
  return post(cookie, 'answer', { questionId: state.current.id, answer })
}

// همه‌ی سؤال‌های الان رو جواب می‌ده
async function finishAll(cookie) {
  let state = await getState(cookie)
  while (!state.finished) {
    state = (await answerCurrent(cookie, `جواب ${state.current.id}`)).body
  }
  return state
}

const playerKeyOf = (cookie) => cookie.split('=')[1]

test('بانک سؤال‌ها: شناسه‌ی یکتا، متن و دسته‌ی معتبر', async () => {
  assert.ok(QUESTIONS.length >= 100)
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length)
  for (const q of QUESTIONS) {
    assert.ok(q.text.length > 5, `سؤال ${q.id}`)
    assert.ok(q.category && q.source, `سؤال ${q.id}`)
  }
})

test('بازیکن تازه: اولین سؤال امروز، بدون منبع و بدون جواب کسی', async () => {
  const { state } = await newPlayer()
  assert.equal(state.finished, false)
  assert.equal(state.batch, 0)
  assert.equal(state.current.number, 1)
  assert.equal(state.current.batchSize, DAILY_COUNT)
  assert.ok(state.current.text.length > 5)
  assert.ok(state.current.category.length > 0)
  assert.equal('source' in state.current, false)
  assert.equal(state.todayAnswered, 0)
  assert.equal(state.testMode, false)
  assert.deepEqual(Object.keys(state.goal).sort(), ['completed', 'perQuestion', 'progress', 'target', 'totalAnswers'])
  assert.equal(state.dailyCount, DAILY_COUNT)
  assert.equal(state.moreCount, BATCH_SIZE)
})

test('بازیکن‌های تازه همه همون سؤال‌های اول رو می‌گیرن (تا جواب‌ها روی همون‌ها جمع بشه)', async () => {
  const a = await newPlayer()
  const b = await newPlayer()
  assert.equal(a.state.current.id, b.state.current.id)
  const first = []
  for (let i = 0; i < DAILY_COUNT; i++) {
    const sa = await getState(a.cookie)
    const sb = await getState(b.cookie)
    assert.equal(sa.current.id, sb.current.id)
    assert.equal(sa.current.number, i + 1)
    first.push(sa.current.id)
    await answerCurrent(a.cookie)
    await answerCurrent(b.cookie)
  }
  assert.equal(new Set(first).size, DAILY_COUNT)
  // نفر سوم، بعد از جواب این دو نفر، همین ۵ سؤال رو می‌بینه (چون جواب بیشتری دارن)
  const c = await newPlayer()
  const seen = []
  let state = c.state
  while (!state.finished) {
    seen.push(state.current.id)
    state = (await answerCurrent(c.cookie)).body
  }
  assert.deepEqual([...seen].sort((x, y) => x - y), [...first].sort((x, y) => x - y))
})

test('جواب دادن: سؤال بعدی میاد، جواب با متن اصلی و نرمال‌شده ذخیره می‌شه، بعد از ۵ تا تموم می‌شه', async () => {
  const { cookie, state } = await newPlayer()
  const first = state.current.id
  const res = await post(cookie, 'answer', { questionId: first, answer: '  شیرینیِ   تر  ' })
  assert.equal(res.status, 200)
  assert.equal(res.body.current.number, 2)
  assert.equal(res.body.todayAnswered, 1)
  const row = db.prepare('SELECT answer, answer_norm FROM survey_answers WHERE player_key = ? AND question_id = ?').get(playerKeyOf(cookie), first)
  assert.equal(row.answer, 'شیرینیِ تر')
  assert.equal(row.answer_norm, 'شیرینیتر') // اعراب (کسره) و فاصله حذف می‌شن

  const done = await finishAll(cookie)
  assert.equal(done.finished, true)
  assert.equal(done.current, null)
  assert.equal(done.todayAnswered, DAILY_COUNT)
  assert.equal(done.canMore, true)
  // رفرش: همون وضعیت
  const again = await getState(cookie)
  assert.equal(again.finished, true)
  assert.equal(again.todayAnswered, DAILY_COUNT)
})

test('جواب به سؤالی که جاری نیست یا بعد از تموم شدن قبول نیست', async () => {
  const { cookie, state } = await newPlayer()
  const other = QUESTIONS.find((q) => q.id !== state.current.id).id
  assert.equal((await post(cookie, 'answer', { questionId: other, answer: 'سلام' })).body.error, 'NOT_CURRENT')
  assert.equal((await post(cookie, 'answer', { questionId: 99999, answer: 'سلام' })).body.error, 'NOT_CURRENT')
  assert.equal((await post(cookie, 'skip', { questionId: other })).body.error, 'NOT_CURRENT')
  await finishAll(cookie)
  const late = await post(cookie, 'answer', { questionId: state.current.id, answer: 'سلام' })
  assert.equal(late.status, 400)
  assert.equal(late.body.error, 'NO_PENDING')
  // یه سؤال رو دوبار جواب نمی‌شه داد
  const count = db.prepare('SELECT COUNT(*) AS n FROM survey_answers WHERE player_key = ? AND question_id = ?').get(playerKeyOf(cookie), state.current.id).n
  assert.equal(count, 1)
})

test('جواب نامعتبر: خالی، فقط عدد، خیلی بلند، غیر متن', async () => {
  const { cookie, state } = await newPlayer()
  const id = state.current.id
  for (const bad of ['', '   ', '123', '؟؟؟', '...', null, 42, { a: 1 }]) {
    const res = await post(cookie, 'answer', { questionId: id, answer: bad })
    assert.equal(res.status, 400, JSON.stringify(bad))
    assert.equal(res.body.error, 'INVALID_ANSWER')
  }
  const long = await post(cookie, 'answer', { questionId: id, answer: 'ا'.repeat(MAX_ANSWER_LENGTH + 1) })
  assert.equal(long.body.error, 'ANSWER_TOO_LONG')
  // هیچ‌کدوم ذخیره نشده
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM survey_answers WHERE player_key = ?').get(playerKeyOf(cookie)).n, 0)
  assert.equal((await post(cookie, 'answer', { questionId: id, answer: 'درسته' })).status, 200)
})

test('رد کردن: سؤال بعدی میاد، جواب حساب نمی‌شه و دوباره نمیاد', async () => {
  const { cookie, state } = await newPlayer()
  const first = state.current.id
  const res = await post(cookie, 'skip', { questionId: first })
  assert.equal(res.status, 200)
  assert.equal(res.body.current.number, 2)
  assert.equal(res.body.todayAnswered, 0)
  const row = db.prepare('SELECT answer, answer_norm FROM survey_answers WHERE player_key = ? AND question_id = ?').get(playerKeyOf(cookie), first)
  assert.deepEqual(row, { answer: null, answer_norm: null })
  // رد کردن توی شمارش جواب‌های سؤال حساب نمی‌شه
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM survey_answers WHERE question_id = ? AND answer IS NOT NULL AND player_key = ?').get(first, playerKeyOf(cookie)).n, 0)

  const done = await finishAll(cookie)
  assert.equal(done.todayAnswered, DAILY_COUNT - 1)
  // «۵ سؤال دیگه» هم اون سؤال رو دوباره نمی‌ده
  const more = await post(cookie, 'more')
  assert.equal(more.status, 200)
  const all = db.prepare('SELECT question_id FROM survey_assign WHERE player_key = ? AND batch = 1').all(playerKeyOf(cookie)).map((r) => r.question_id)
  assert.equal(all.includes(first), false)
})

test('«۵ سؤال دیگه»: وسط سؤال‌ها نه، بعد از تموم شدن آره، بدون تکرار', async () => {
  const { cookie } = await newPlayer()
  assert.equal((await post(cookie, 'more')).body.error, 'PENDING_QUESTIONS')
  await finishAll(cookie)

  const seen = new Set(db.prepare('SELECT question_id FROM survey_answers WHERE player_key = ?').all(playerKeyOf(cookie)).map((r) => r.question_id))
  const more = await post(cookie, 'more')
  assert.equal(more.status, 200)
  assert.equal(more.body.batch, 1)
  assert.equal(more.body.finished, false)
  assert.equal(more.body.current.number, 1)
  assert.equal(more.body.current.batchSize, BATCH_SIZE)
  assert.equal((await post(cookie, 'more')).body.error, 'PENDING_QUESTIONS')

  const done = await finishAll(cookie)
  assert.equal(done.batch, 1)
  assert.equal(done.todayAnswered, DAILY_COUNT + BATCH_SIZE)
  const ids = db.prepare('SELECT question_id FROM survey_answers WHERE player_key = ?').all(playerKeyOf(cookie)).map((r) => r.question_id)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids.length, DAILY_COUNT + BATCH_SIZE)
  const extras = db.prepare('SELECT question_id FROM survey_assign WHERE player_key = ? AND batch = 1').all(playerKeyOf(cookie)).map((r) => r.question_id)
  assert.equal(extras.length, BATCH_SIZE)
  for (const id of extras) assert.equal(seen.has(id), false)

  // دسته‌ی بعدی هم بی‌تکراره
  const third = await post(cookie, 'more')
  assert.equal(third.body.batch, 2)
})

test('اولویت سؤال‌ها: اول اون‌هایی که به ۱۰۰ نزدیک‌ترن، سؤال کامل‌شده آخر', async () => {
  const { cookie } = await newPlayer()
  await finishAll(cookie)
  const key = playerKeyOf(cookie)
  const handled = new Set(db.prepare('SELECT question_id FROM survey_answers WHERE player_key = ?').all(key).map((r) => r.question_id))
  const free = QUESTIONS.filter((q) => !handled.has(q.id))
  const counts = new Map(db.prepare('SELECT question_id, COUNT(*) AS n FROM survey_answers WHERE answer IS NOT NULL GROUP BY question_id').all().map((r) => [r.question_id, r.n]))
  const untouched = free.filter((q) => !(counts.get(q.id) > 0))
  const nearest = untouched.slice(0, BATCH_SIZE).map((q) => q.id) // این ۵ تا ۶۰ جواب می‌گیرن
  const complete = untouched[BATCH_SIZE].id // این یکی ۱۰۰ جواب می‌گیره و باید آخر بره
  const insert = db.prepare('INSERT OR IGNORE INTO survey_answers (player_key, question_id, answer, answer_norm, created_at) VALUES (?, ?, ?, ?, ?)')
  for (let i = 0; i < 60; i++) for (const id of nearest) insert.run(`fake-${i}`, id, 'الف', 'الف', Date.now())
  for (let i = 0; i < ANSWERS_PER_QUESTION; i++) insert.run(`fake-${i}`, complete, 'الف', 'الف', Date.now())

  const more = await post(cookie, 'more')
  assert.equal(more.status, 200)
  const got = db.prepare('SELECT question_id FROM survey_assign WHERE player_key = ? AND batch = 1').all(key).map((r) => r.question_id)
  assert.deepEqual([...got].sort((x, y) => x - y), [...nearest].sort((x, y) => x - y))
  assert.equal(got.includes(complete), false)
  db.prepare("DELETE FROM survey_answers WHERE player_key LIKE 'fake-%'").run()
})

test('فردا بازیکن قبلی ۵ سؤال تازه می‌گیره (از اون‌هایی که هنوز جواب نداده)', async () => {
  const { cookie } = await newPlayer()
  const key = playerKeyOf(cookie)
  await finishAll(cookie)
  const before = db.prepare('SELECT question_id FROM survey_answers WHERE player_key = ?').all(key).map((r) => r.question_id)
  // «فردا»: سؤال‌های امروز رو به تاریخ دیروز برمی‌گردونیم
  db.prepare("UPDATE survey_assign SET date = '2000-01-01' WHERE player_key = ?").run(key)
  const tomorrow = await getState(cookie)
  assert.equal(tomorrow.finished, false)
  assert.equal(tomorrow.current.number, 1)
  assert.equal(tomorrow.batch, 0)
  assert.equal(before.includes(tomorrow.current.id), false)
  assert.equal(tomorrow.todayAnswered, 0)
})

test('وقتی همه‌ی سؤال‌ها تموم بشن «سؤال دیگه‌ای نیست»', async () => {
  const { cookie } = await newPlayer()
  const key = playerKeyOf(cookie)
  await finishAll(cookie)
  // همه‌ی بقیه‌ی سؤال‌ها رو جوری ثبت می‌کنیم که این بازیکن جواب داده
  const insert = db.prepare('INSERT OR IGNORE INTO survey_answers (player_key, question_id, answer, answer_norm, created_at) VALUES (?, ?, ?, ?, ?)')
  for (const q of QUESTIONS) insert.run(key, q.id, 'الف', 'الف', Date.now())
  const state = await getState(cookie)
  assert.equal(state.canMore, false)
  const res = await post(cookie, 'more')
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'NO_MORE_QUESTIONS')
  db.prepare('DELETE FROM survey_answers WHERE player_key = ?').run(key) // تا شمارش جواب‌ها برای تست‌های بعدی به هم نریزه
})

test('جواب‌های بقیه و درصدها هیچ‌وقت توی وضعیت نمیان', async () => {
  const a = await newPlayer()
  const b = await newPlayer()
  const secret = 'کیوی‌زیرین‌خاص'
  await answerCurrent(a.cookie, secret)
  const stateB = JSON.stringify(await getState(b.cookie))
  assert.equal(stateB.includes(secret), false)
  assert.equal(stateB.includes('percent'), false)
  assert.equal(stateB.includes('answers'), false)
  // وضعیت خود بازیکن هم جواب‌های ذخیره‌شده‌ی خودش رو پس نمی‌ده
  assert.equal(JSON.stringify(await getState(a.cookie)).includes(secret), false)
})

test('پیشنهاد سؤال: ذخیره می‌شه، کوتاه و بلند رد می‌شه، روزی حداکثر ۵ تا', async () => {
  const { cookie } = await newPlayer()
  const ok = await post(cookie, 'suggest', { text: '  یه چیزی بگو که توی کوله‌ی کوهنوردی می‌ذارن  ' })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.ok, true)
  const row = db.prepare('SELECT text FROM survey_suggestions WHERE player_key = ?').get(playerKeyOf(cookie))
  assert.equal(row.text, 'یه چیزی بگو که توی کوله‌ی کوهنوردی می‌ذارن')
  for (const bad of ['', 'سلام', 'کوتاه', '123456789', null, 5, 'ا'.repeat(201)]) {
    const res = await post(cookie, 'suggest', { text: bad })
    assert.equal(res.status, 400, JSON.stringify(bad))
    assert.equal(res.body.error, 'INVALID_SUGGESTION')
  }
  for (let i = 1; i < MAX_SUGGESTIONS_PER_DAY; i++) assert.equal((await post(cookie, 'suggest', { text: `سؤال پیشنهادی شماره ${i}` })).status, 200)
  const limit = await post(cookie, 'suggest', { text: 'یه سؤال اضافه‌ی دیگه' })
  assert.equal(limit.body.error, 'TOO_MANY_SUGGESTIONS')
})

test('هدف جمعی: سؤالی که به ۱۰۰ جواب برسه حساب می‌شه، رد کردن‌ها نه', async () => {
  const before = (await newPlayer()).state.goal
  const q = QUESTIONS[QUESTIONS.length - 1].id
  const insert = db.prepare('INSERT INTO survey_answers (player_key, question_id, answer, answer_norm, created_at) VALUES (?, ?, ?, ?, ?)')
  const existing = db.prepare('SELECT COUNT(*) AS n FROM survey_answers WHERE question_id = ? AND answer IS NOT NULL').get(q).n
  const toAdd = ANSWERS_PER_QUESTION - 1 - existing // تا دقیقاً ۹۹ جواب بشه
  for (let i = 0; i < toAdd; i++) insert.run(`goal-${i}`, q, 'ب', 'ب', Date.now())
  for (let i = 0; i < 20; i++) insert.run(`goal-skip-${i}`, q, null, null, Date.now()) // رد کردن‌ها شمرده نمی‌شن
  const mid = (await newPlayer()).state.goal
  assert.equal(mid.completed, before.completed)
  insert.run('goal-last', q, 'ب', 'ب', Date.now())
  const after = (await newPlayer()).state.goal
  assert.ok(after.progress > mid.progress && after.progress <= 1, `${mid.progress} -> ${after.progress}`)
  assert.equal(after.completed, before.completed + 1)
  assert.equal(after.totalAnswers, before.totalAnswers + toAdd + 1)
  assert.equal(after.target, 100)
  db.prepare("DELETE FROM survey_answers WHERE player_key LIKE 'goal-%'").run()
})

test('با ثبت‌نام، جواب‌های مهمان به حساب منتقل می‌شه', async () => {
  const { cookie } = await newPlayer()
  await answerCurrent(cookie, 'اولی')
  await answerCurrent(cookie, 'دومی')
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'survey_player', password: 'pass-1234' }),
  })
  assert.equal(signup.status, 201)
  const authCookie = signup.headers.getSetCookie().find((c) => c.startsWith('songmore_auth=')).split(';')[0]
  const state = await getState(`${cookie}; ${authCookie}`)
  assert.equal(state.todayAnswered, 2)
  assert.equal(state.current.number, 3)
})

test('دکمه‌ی تست فقط توی حالت تست کار می‌کنه', async () => {
  const { cookie } = await newPlayer()
  const res = await fetch(`${baseUrl}/api/survey/test/reset`, { method: 'POST', headers: { Cookie: cookie } })
  assert.equal(res.status, 404)
})

test('آمار پروفایل: فقط کاربر واردشده؛ جواب‌داده، رد‌شده، روزها، امروز و پیشنهادها', async () => {
  // مهمان آمار نداره
  const guest = await newPlayer()
  const noLogin = await fetch(`${baseUrl}/api/survey/stats`, { headers: { Cookie: guest.cookie } })
  assert.equal(noLogin.status, 401)

  // مهمان ۲ تا جواب می‌ده، بعد ثبت‌نام می‌کنه (جواب‌ها منتقل می‌شن) و بعد از ورود ۱ تا رد و ۱ تا جواب دیگه می‌ده
  const { cookie } = await newPlayer()
  await answerCurrent(cookie, 'اولی')
  await answerCurrent(cookie, 'دومی')
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ username: 'survey_stats', password: 'pass-1234' }),
  })
  assert.equal(signup.status, 201)
  const authCookie = signup.headers.getSetCookie().find((c) => c.startsWith('songmore_auth=')).split(';')[0]
  const both = `${cookie}; ${authCookie}`
  const state = await getState(both)
  await post(both, 'skip', { questionId: state.current.id })
  await answerCurrent(both, 'سومی')
  await post(both, 'suggest', { text: 'یه چیزی بگو که توی کوله‌ی کوهنوردی می‌ذارن' })

  const res = await fetch(`${baseUrl}/api/survey/stats`, { headers: { Cookie: both } })
  assert.equal(res.status, 200)
  const stats = await res.json()
  assert.equal(stats.answered, 3)
  assert.equal(stats.skipped, 1)
  assert.equal(stats.today, 3)
  assert.equal(stats.days, 1)
  assert.equal(stats.suggestions, 1)
  assert.equal(stats.totalQuestions, QUESTIONS.length)
  assert.deepEqual(Object.keys(stats.goal).sort(), ['completed', 'perQuestion', 'progress', 'target', 'totalAnswers'])
  // جواب‌های متنی هیچ‌جا نیست
  assert.equal(JSON.stringify(stats).includes('اولی'), false)
})

test('روزهای مشارکت: جواب‌های روزهای مختلف جدا شمرده می‌شن (به وقت تهران)', async () => {
  const { cookie } = await newPlayer()
  const key = playerKeyOf(cookie)
  await answerCurrent(cookie, 'الف')
  // یه جواب قدیمی‌تر برای دو روز پیش و دیروز
  const insert = db.prepare('INSERT INTO survey_answers (player_key, question_id, answer, answer_norm, created_at) VALUES (?, ?, ?, ?, ?)')
  const free = QUESTIONS.filter((q) => !db.prepare('SELECT 1 FROM survey_answers WHERE player_key = ? AND question_id = ?').get(key, q.id))
  insert.run(key, free[0].id, 'ب', 'ب', Date.now() - 2 * 24 * 3600 * 1000)
  insert.run(key, free[1].id, 'ج', 'ج', Date.now() - 1 * 24 * 3600 * 1000)
  // رد کردن مشارکت حساب نمی‌شه
  insert.run(key, free[2].id, null, null, Date.now() - 5 * 24 * 3600 * 1000)
  const { getSurveyStats } = await import('../../games/survey/survey.js')
  const stats = getSurveyStats(key, getTodayDateString())
  assert.equal(stats.answered, 3)
  assert.equal(stats.skipped, 1)
  assert.equal(stats.days, 3)
  assert.equal(stats.today, 1)
})
