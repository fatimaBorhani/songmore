// راهنمای بازی‌ها: یادمون بمونه هر حساب راهنمای کدوم بازی رو دیده
// (مهمان چیزی ذخیره نمی‌کنه؛ برای مهمان راهنما هر بار اول بازی باز می‌شه)
import express from 'express'
import { db } from './db.js'

// بازی‌هایی که راهنما دارن (همون شناسه‌های games/index.js کلاینت)
export const HELP_GAMES = ['song', 'word', 'color', 'clue', 'survey']

export const helpRouter = express.Router()

// فقط کاربر واردشده
function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'NOT_LOGGED_IN' })
  next()
}

// GET /api/help → { seen: ['word', ...] }
helpRouter.get('/', requireUser, (req, res) => {
  const rows = db.prepare('SELECT game FROM help_seen WHERE user_id = ? ORDER BY game').all(req.user.id)
  res.json({ seen: rows.map((r) => r.game) })
})

// POST /api/help/seen { game } → راهنمای این بازی دیده شد (دوباره زدن خطا نیست)
helpRouter.post('/seen', requireUser, (req, res) => {
  const game = req.body?.game
  if (!HELP_GAMES.includes(game)) return res.status(400).json({ error: 'INVALID_GAME' })
  db.prepare('INSERT OR IGNORE INTO help_seen (user_id, game) VALUES (?, ?)').run(req.user.id, game)
  res.json({ ok: true })
})
