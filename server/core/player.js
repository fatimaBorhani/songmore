// «بازیکن» کیه؟ اگه وارد شده، حساب کاربریش؛ وگرنه همون کوکی مرورگر (مهمان).
// حدس‌ها با همین کلید ذخیره می‌شن (بازی آهنگ: ستون session_id جدول guesses، واژه‌یاب: player_key جدول word_guesses):
//   کاربر واردشده -> 'user:<id>'   (روی همه‌ی دستگاه‌هاش یکیه)
//   مهمان        -> شناسه‌ی تصادفی کوکی (UUID؛ هیچ‌وقت با 'user:' شروع نمی‌شه)
import { db } from './db.js'
import { getAuthToken, getUserByToken } from './auth.js'

export function userPlayerKey(userId) {
  return `user:${userId}`
}

// middleware: req.user و req.playerKey رو برای بقیه‌ی مسیرها آماده می‌کنه
export function attachPlayer(req, res, next) {
  req.user = getUserByToken(getAuthToken(req))
  req.playerKey = req.user ? userPlayerKey(req.user.id) : req.sessionId
  next()
}

// بازی‌هایی که این مرورگر به عنوان مهمان کرده رو به حساب کاربر منتقل می‌کنه.
// فقط روزهایی که کاربر خودش بازی نکرده؛ اگه یه روز هر دو بازی کردن، بازی حساب می‌مونه.
export function claimGuestGames(sessionId, userId) {
  if (!sessionId) return 0
  const userKey = userPlayerKey(userId)
  // بازی آهنگ
  const songInfo = db
    .prepare(
      `UPDATE guesses SET session_id = ?
       WHERE session_id = ?
         AND date NOT IN (SELECT date FROM guesses WHERE session_id = ?)`
    )
    .run(userKey, sessionId, userKey)
  // بازی واژه‌یاب. اول «جواب رو ببینم»ها (شرطشون به حدس‌های حساب کاربره، پس باید قبل از منتقل شدن حدس‌ها بیان)
  db.prepare(
    `UPDATE word_gaveup SET player_key = ?
     WHERE player_key = ?
       AND date NOT IN (SELECT date FROM word_guesses WHERE player_key = ?)`
  ).run(userKey, sessionId, userKey)
  const wordInfo = db
    .prepare(
      `UPDATE word_guesses SET player_key = ?
       WHERE player_key = ?
         AND date NOT IN (SELECT date FROM word_guesses WHERE player_key = ?)`
    )
    .run(userKey, sessionId, userKey)
  // بازی حافظه‌ی رنگ
  const colorInfo = db
    .prepare(
      `UPDATE color_guesses SET player_key = ?
       WHERE player_key = ?
         AND date NOT IN (SELECT date FROM color_guesses WHERE player_key = ?)`
    )
    .run(userKey, sessionId, userKey)
  return songInfo.changes + wordInfo.changes + colorInfo.changes
}
