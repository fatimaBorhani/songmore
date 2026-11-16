// تست تقویم فعالیت صفحه‌ی حساب: هفته‌های شنبه تا جمعه، رنگ روزها و روزهای آینده
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WEEKS, addDays, buildCalendar, faDay, faMonthYear, gamesOf, levelOf } from '../src/pages/calendar.js'

test('addDays روز رو جلو و عقب می‌بره، از مرز ماه و سال هم رد می‌شه', () => {
  assert.equal(addDays('2026-11-14', 1), '2026-11-15')
  assert.equal(addDays('2026-11-14', -14), '2026-10-31')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2028-02-28', 1), '2028-02-29') // سال کبیسه
  assert.equal(addDays('2026-11-14', 0), '2026-11-14')
})

test('gamesOf آهنگ‌های مسابقه‌ای و بازی‌های تمرینی رو جمع می‌کنه', () => {
  assert.equal(gamesOf(undefined), 0)
  assert.equal(gamesOf({ daily: null, practice: 0 }), 0)
  assert.equal(gamesOf({ daily: null, practice: 4 }), 4)
  assert.equal(gamesOf({ daily: { songs: 3 }, practice: 2 }), 5)
})

test('levelOf: ۰ بازی نشده، ۱، ۲، ۳ تا ۴، و ۵ به بالا', () => {
  const day = (n) => ({ daily: null, practice: n })
  assert.deepEqual([0, 1, 2, 3, 4, 5, 30].map((n) => levelOf(day(n))), [0, 1, 2, 3, 3, 4, 4])
  assert.equal(levelOf(undefined), 0)
})

test('تقویم ۱۰ هفته‌ی کامل داره که هر هفته از شنبه شروع می‌شه و امروز توی هفته‌ی آخره', () => {
  const today = '2026-11-16' // دوشنبه
  const { cells } = buildCalendar(today, [])
  assert.equal(cells.length, WEEKS * 7)
  // اولین خونه‌ی هر ستون شنبه‌ست (getUTCDay شنبه = ۶)
  for (let i = 0; i < cells.length; i += 7) {
    assert.equal(new Date(`${cells[i].date}T12:00:00Z`).getUTCDay(), 6)
  }
  const lastWeek = cells.slice(-7).map((c) => c.date)
  assert.ok(lastWeek.includes(today))
  assert.deepEqual(lastWeek, ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'])
})

test('روزهای بعد از امروز «آینده» هستن و فعالیت نمی‌گیرن', () => {
  const today = '2026-11-16'
  const activity = [
    { date: '2026-11-16', daily: { songs: 3 }, practice: 2 },
    { date: '2026-11-14', daily: null, practice: 1 },
    { date: '2026-11-18', daily: null, practice: 9 }, // آینده؛ نباید حساب بشه
    { date: '2020-01-01', daily: null, practice: 9 }, // خیلی قدیمی؛ توی تقویم نیست
  ]
  const { cells, activeDays } = buildCalendar(today, activity)
  const cell = (date) => cells.find((c) => c.date === date)
  assert.equal(cell('2026-11-16').level, 4)
  assert.equal(cell('2026-11-16').future, false)
  assert.equal(cell('2026-11-14').level, 1)
  assert.equal(cell('2026-11-18').future, true)
  assert.equal(cell('2026-11-18').level, 0)
  assert.equal(cell('2026-11-15').level, 0)
  assert.equal(activeDays, 2)
})

test('وقتی امروز شنبه یا جمعه‌ست هم هفته‌ی آخر درست درمیاد', () => {
  const saturday = buildCalendar('2026-11-14', []).cells
  assert.equal(saturday.at(-7).date, '2026-11-14')
  assert.equal(saturday.filter((c) => c.future).length, 6)
  const friday = buildCalendar('2026-11-20', []).cells
  assert.equal(friday.at(-1).date, '2026-11-20')
  assert.equal(friday.filter((c) => c.future).length, 0)
})

test('تاریخ‌ها به تقویم شمسی نوشته می‌شن', () => {
  assert.equal(faDay('2026-03-21'), '۱ فروردین') // نوروز ۱۴۰۵
  assert.equal(faMonthYear('2026-03-21T12:00:00Z'), 'فروردین ۱۴۰۵')
})
