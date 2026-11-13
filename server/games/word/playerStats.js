// آمار واژه‌یاب یه بازیکن از روی حدس‌های ذخیره‌شده (برای صفحه‌ی حساب).
// هر کلمه‌ی تموم‌شده (پیدا شده یا «جواب رو ببینم») یه بازیه. برد = توی ۶ حدس پیدا شده؛
// کلمه‌ای که با «ادامه دادن» بعد از ۶ حدس پیدا شده برد نیست (lateSolved).
// «رکورد» مثل بازی آهنگ: روزهای بازی‌شده‌ی پشت‌سر‌هم که حداقل یه کلمه‌شون برد بوده؛ روزی که همه‌ی کلمه‌هاش باخت بود رکورد رو صفر می‌کنه.
import { db } from '../../core/db.js'
import { MAX_GUESSES } from './wordLists.js'

export function getWordStats(playerKey) {
  const rows = db
    .prepare(
      `SELECT g.date, g.length, g.word, d.word AS answer
       FROM word_guesses g
       JOIN word_daily d ON d.date = g.date AND d.length = g.length
       WHERE g.player_key = ?
       ORDER BY g.date, g.length, g.guess_number`
    )
    .all(playerKey)
  const gaveUp = new Set(
    db
      .prepare('SELECT date, length FROM word_gaveup WHERE player_key = ?')
      .all(playerKey)
      .map((r) => `${r.date}|${r.length}`)
  )

  // هر (روز، طول) یه کلمه
  const slots = new Map()
  for (const r of rows) {
    const key = `${r.date}|${r.length}`
    if (!slots.has(key)) slots.set(key, { date: r.date, length: r.length, answer: r.answer, count: 0, solved: false })
    const slot = slots.get(key)
    slot.count += 1
    if (r.word === r.answer) slot.solved = true
  }

  const maxGuesses = Math.max(...Object.values(MAX_GUESSES))
  const distribution = Array(maxGuesses).fill(0) // distribution[i] = چند کلمه با i+1 حدس پیدا شد
  const byLength = new Map()
  const days = new Map() // روز -> { won: این روز برد داشته؟ }
  let played = 0
  let wins = 0
  let lateSolved = 0
  let winGuesses = 0

  for (const slot of slots.values()) {
    const finished = slot.solved || gaveUp.has(`${slot.date}|${slot.length}`)
    if (!finished) continue
    const won = slot.solved && slot.count <= MAX_GUESSES[slot.length]
    played += 1
    if (won) {
      wins += 1
      winGuesses += slot.count
      distribution[slot.count - 1] += 1
    } else if (slot.solved) {
      lateSolved += 1
    }
    const len = byLength.get(slot.length) ?? { length: slot.length, played: 0, wins: 0 }
    len.played += 1
    if (won) len.wins += 1
    byLength.set(slot.length, len)
    const day = days.get(slot.date) ?? { won: false }
    if (won) day.won = true
    days.set(slot.date, day)
  }

  let currentStreak = 0
  let maxStreak = 0
  for (const date of [...days.keys()].sort()) {
    if (days.get(date).won) {
      currentStreak += 1
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return {
    played,
    wins,
    lateSolved,
    currentStreak,
    maxStreak,
    averageGuesses: wins > 0 ? Math.round((winGuesses / wins) * 10) / 10 : 0,
    distribution,
    byLength: [...byLength.values()].sort((a, b) => a.length - b.length),
  }
}
