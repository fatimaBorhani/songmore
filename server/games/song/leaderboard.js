// جدول امتیاز یه روز: فقط کسایی که حساب دارن و همه‌ی آهنگ‌های اون روز رو تموم کردن.
// امتیاز = جمع امتیاز آهنگ‌ها. ترتیب: امتیاز بیشتر بالاتر؛ اگه مساوی بود، کسی که زودتر تموم کرده بالاتر.
import { db } from '../../core/db.js'
import { computeScore } from './scoring.js'

export const LEADERBOARD_SIZE = 20

export function getDailyLeaderboard(date, currentUserId = null) {
  const songCount = db.prepare('SELECT COUNT(*) AS n FROM daily_songs WHERE date = ?').get(date).n
  const rows = db
    .prepare(
      `SELECT g.session_id, g.slot, g.result, g.created_at, u.id AS user_id, u.username
       FROM guesses g
       JOIN users u ON g.session_id = 'user:' || u.id
       WHERE g.date = ?
       ORDER BY g.session_id, g.slot, g.guess_number`
    )
    .all(date)

  // حدس‌های هر کاربر رو کنار هم بذار، جدا برای هر آهنگ
  const players = new Map()
  for (const row of rows) {
    if (!players.has(row.user_id)) {
      players.set(row.user_id, { userId: row.user_id, username: row.username, songs: new Map() })
    }
    const songs = players.get(row.user_id).songs
    if (!songs.has(row.slot)) songs.set(row.slot, [])
    songs.get(row.slot).push(row)
  }

  const finished = []
  for (const player of players.values()) {
    // همه‌ی آهنگ‌های روز باید تموم شده باشن
    if (songCount === 0 || player.songs.size < songCount) continue
    let score = 0
    let allDone = true
    const times = []
    for (const guesses of player.songs.values()) {
      const s = computeScore(guesses)
      if (s === null) allDone = false
      else score += s
      times.push(...guesses.map((g) => g.created_at).filter((t) => t !== null))
    }
    if (!allDone) continue // هنوز تموم نکرده
    // زمان تموم کردن = زمان آخرین حدس (برای بازی‌های قدیمی که زمان ندارن، آخر صف)
    finished.push({
      userId: player.userId,
      username: player.username,
      score,
      finishedAt: times.length ? Math.max(...times) : Number.MAX_SAFE_INTEGER,
    })
  }

  finished.sort((a, b) => b.score - a.score || a.finishedAt - b.finishedAt)

  const ranked = finished.map((p, i) => ({ rank: i + 1, username: p.username, score: p.score, userId: p.userId }))
  const me = currentUserId ? ranked.find((p) => p.userId === currentUserId) || null : null

  return {
    date,
    totalPlayers: ranked.length,
    // userId فقط برای پیدا کردن «من»ه؛ به کلاینت فرستاده نمی‌شه
    top: ranked.slice(0, LEADERBOARD_SIZE).map(({ rank, username, score, userId }) => ({
      rank,
      username,
      score,
      isMe: userId === currentUserId,
    })),
    me: me ? { rank: me.rank, score: me.score } : null,
  }
}
