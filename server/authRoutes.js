// مسیرهای API احراز هویت: ثبت‌نام، ورود، خروج، «من کی‌ام؟»
import express from 'express'
import {
  authenticate,
  clearAuthCookie,
  clearFailedLogins,
  createAuthSession,
  createUser,
  deleteAuthSession,
  getAuthToken,
  getUserByToken,
  isLoginBlocked,
  isValidPassword,
  isValidUsername,
  recordFailedLogin,
  setAuthCookie,
} from './auth.js'
import { claimGuestGames } from './player.js'

export const authRouter = express.Router()

// Express 4 خطای تابع‌های async رو خودش نمی‌گیره؛ این کمکی جلوی گیر کردن درخواست رو می‌گیره
function asyncRoute(handler) {
  return (req, res, next) => handler(req, res, next).catch(next)
}

authRouter.post(
  '/signup',
  asyncRoute(async (req, res) => {
    const { username, password } = req.body || {}
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'INVALID_USERNAME' })
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'WEAK_PASSWORD' })
    }

    let user
    try {
      user = await createUser(username, password)
    } catch (e) {
      if (e.message === 'USERNAME_TAKEN') return res.status(409).json({ error: 'USERNAME_TAKEN' })
      throw e
    }

    // بازی‌هایی که توی همین مرورگر به عنوان مهمان کرده، مال حساب جدیدش بشن
    claimGuestGames(req.sessionId, user.id)
    setAuthCookie(res, createAuthSession(user.id))
    res.status(201).json({ user })
  })
)

authRouter.post(
  '/login',
  asyncRoute(async (req, res) => {
    const ip = req.ip
    if (isLoginBlocked(ip)) {
      return res.status(429).json({ error: 'TOO_MANY_ATTEMPTS' })
    }

    const { username, password } = req.body || {}
    // برای ورودی‌های نامعتبر هم همون خطای «نام یا رمز اشتباه» تا چیزی لو نره
    const user =
      typeof username === 'string' && typeof password === 'string' && password.length <= 128
        ? await authenticate(username, password)
        : null

    if (!user) {
      recordFailedLogin(ip)
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' })
    }

    clearFailedLogins(ip)
    claimGuestGames(req.sessionId, user.id)
    // اگه از قبل وارد بود، نشست قبلی رو پاک کن و یه توکن تازه بده
    deleteAuthSession(getAuthToken(req))
    setAuthCookie(res, createAuthSession(user.id))
    res.json({ user })
  })
)

authRouter.post('/logout', (req, res) => {
  deleteAuthSession(getAuthToken(req))
  clearAuthCookie(res)
  res.json({ ok: true })
})

authRouter.get('/me', (req, res) => {
  res.json({ user: getUserByToken(getAuthToken(req)) })
})
