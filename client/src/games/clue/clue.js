// کمک‌های بازی «جوربندی»: گرمای هر رتبه، ترتیب لیست حدس‌ها و متن اشتراک
import { faDigits, faNumber } from '../../shared/format.js'

// مرز داغ و ولرم (رتبه)
export const HOT_MAX = 50
export const WARM_MAX = 300

// گرمای یه حدس: hot (نزدیک)، warm، cold (دور یا بیرون از لیست نزدیک‌ها)
export function heatOf(rank) {
  if (rank === null || rank === undefined) return 'cold'
  if (rank <= HOT_MAX) return 'hot'
  if (rank <= WARM_MAX) return 'warm'
  return 'cold'
}

// چند درصد ردیف رنگ بخوره (مثل یه نوار پیشرفت): رتبه‌ی ۱ پر، هر چی دورتر کمتر؛ از FILL_LIMIT به بعد فقط نوار باریک کنار ردیف
export const FILL_LIMIT = 1300
export function fillPercent(rank) {
  if (rank === null || rank === undefined || rank >= FILL_LIMIT) return 0
  return Math.max(4, Math.round((1 - (rank - 1) / FILL_LIMIT) * 100))
}

// متن رتبه: عدد فارسی، یا «دور»
export function rankLabel(rank) {
  return rank === null || rank === undefined ? 'دور' : faNumber(rank)
}

// لیست حدس‌ها از نزدیک به دور؛ «دور»ها آخر، به ترتیب زده شدن
export function sortGuesses(guesses) {
  return [...guesses].sort((a, b) => {
    if (a.rank === null && b.rank === null) return a.number - b.number
    if (a.rank === null) return 1
    if (b.rank === null) return -1
    return a.rank - b.rank
  })
}

// متن اشتراک: تعداد حدس و راهنما و یه مربع رنگی برای هر حدس به ترتیب، بدون لو دادن کلمه‌ها
const SHARE_SQUARES = { hot: '🟦', warm: '⬜', cold: '⬛' }
export function shareText(game, title) {
  const RLM = '‏' // تا توی برنامه‌ها خط‌ها راست‌به‌چپ نشون داده بشن
  const result = game.found ? `پیداش کردم با ${game.guessCount} حدس` : `تسلیم شدم بعد از ${game.guessCount} حدس`
  const hints = game.hintCount ? ` و ${game.hintCount} راهنما` : ''
  const squares = game.guesses.map((g) => (g.hint ? '💡' : SHARE_SQUARES[heatOf(g.rank)]))
  const rows = []
  for (let i = 0; i < squares.length; i += 10) rows.push(RLM + squares.slice(i, i + 10).join(''))
  return [faDigits(title), RLM + faDigits(result + hints), ...rows].join('\n')
}
