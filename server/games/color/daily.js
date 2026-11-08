// رنگ‌های هر روز: ۵ رنگ تصادفی که برای همه‌ی بازیکن‌ها یکیه.
// موقع اولین درخواست امروز ساخته و توی دیتابیس ذخیره می‌شه (از قبل قابل حدس نیست).
import { randomInt } from 'node:crypto'
import { db } from '../../core/db.js'
import { ROUNDS } from './scoring.js'

// rand(min, max): عدد صحیح تصادفی از min تا max-1 (توی تست یه نمونه‌ی ثابت می‌دیم)
export function generateColors(rand = randomInt) {
  // رنگ‌مایه‌ها حدود ۷۲ درجه از هم فاصله دارن (با کمی جابه‌جایی) تا دورها شبیه هم نشن، بعد قاطی می‌شن
  const baseHue = rand(0, 360)
  const steps = Array.from({ length: ROUNDS }, (_, i) => i)
  for (let i = steps.length - 1; i > 0; i--) {
    const j = rand(0, i + 1)
    ;[steps[i], steps[j]] = [steps[j], steps[i]]
  }
  return steps.map((k) => ({
    h: (((baseHue + k * 72 + rand(-18, 19)) % 360) + 360) % 360,
    s: rand(35, 96), // نه خیلی کم‌رنگ
    b: rand(45, 96), // نه خیلی تاریک
  }))
}

function readColors(date) {
  return db
    .prepare('SELECT h, s, b FROM color_daily WHERE date = ? ORDER BY round')
    .all(date)
}

// رنگ‌های امروز (اگه هنوز ساخته نشده، می‌سازه)
export function getDailyColors(date) {
  const existing = readColors(date)
  if (existing.length === ROUNDS) return existing
  const insert = db.prepare('INSERT OR IGNORE INTO color_daily (date, round, h, s, b) VALUES (?, ?, ?, ?, ?)')
  db.transaction(() => {
    generateColors().forEach((c, i) => insert.run(date, i + 1, c.h, c.s, c.b))
  })()
  return readColors(date)
}

// فقط حالت تست: رنگ‌های امروز دوباره ساخته می‌شن
export function regenerateDailyColors(date) {
  db.prepare('DELETE FROM color_daily WHERE date = ?').run(date)
  return getDailyColors(date)
}
