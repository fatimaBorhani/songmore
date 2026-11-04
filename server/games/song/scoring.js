// امتیازدهی: هرچی کمتر شنیده باشی و کمتر اشتباه کرده باشی، امتیاز بیشتر.
// امتیاز هر بازی = ارزش مرحله − جریمه‌ی حدس‌های غلط (برد حداقل MIN_WIN_SCORE، باخت صفر)
// همه‌ی حساب‌ها روی سروره، پس با دستکاری مرورگر نمی‌شه امتیاز بیشتر گرفت.

// مراحل کلیپ (ثانیه)؛ guesses.js هم از همین‌جا می‌گیره تا فقط یه جا تعریف بشه
export const STAGES = [0.15, 0.5, 2, 8, 15]
export const MAX_GUESSES = 5

export const MAX_SCORE = 10000 // حدس درست توی کوتاه‌ترین مرحله
export const FLOOR_SCORE = 3500 // ارزش آخرین مرحله
export const WRONG_PENALTY = 1000 // حدس غلط
export const PRESENT_PENALTY = 500 // «خواننده درسته»: نصف جریمه
export const MIN_WIN_SCORE = 1000 // کسی که برده هیچ‌وقت کمتر از این نمی‌گیره

// ارزش یه مرحله، با همون منحنی Songless:
// جای مرحله روی مقیاس لگاریتمی (۰ تا ۱) -> اول تند پایین میاد، بعد آروم
export function stageValue(seconds) {
  const first = STAGES[0]
  const last = STAGES[STAGES.length - 1]
  const x = Math.log(seconds / first) / Math.log(last / first)
  return Math.max(FLOOR_SCORE, Math.round(FLOOR_SCORE + (MAX_SCORE - FLOOR_SCORE) * (1 - x) ** 1.55))
}

function countResults(guesses) {
  let skips = 0
  let penalty = 0
  for (const g of guesses) {
    if (g.result === 'skipped') skips += 1
    else if (g.result === 'incorrect') penalty += WRONG_PENALTY
    else if (g.result === 'present') penalty += PRESENT_PENALTY
  }
  return { skips, penalty }
}

// اگه با این تعداد رد کردن و جریمه درست حدس بزنه، چند امتیاز می‌گیره
function winScore(skips, penalty) {
  const stage = STAGES[Math.min(skips, STAGES.length - 1)]
  return Math.max(MIN_WIN_SCORE, stageValue(stage) - penalty)
}

// امتیاز یه بازی تموم‌شده؛ برای بازی نیمه‌کاره null
// guesses باید به ترتیب guess_number باشن
export function computeScore(guesses) {
  const correctIndex = guesses.findIndex((g) => g.result === 'correct')
  if (correctIndex === -1) {
    return guesses.length >= MAX_GUESSES ? 0 : null // باخت یا هنوز تموم نشده
  }
  const { skips, penalty } = countResults(guesses.slice(0, correctIndex))
  return winScore(skips, penalty)
}

// برای بازی در جریان: «ارزش الان» (اگه حدس بعدی درست باشه چند می‌گیره)
// و اینکه اگه «رد کردن» بزنه ارزشش چقدر می‌شه
export function getWorth(guesses) {
  const { skips, penalty } = countResults(guesses)
  return {
    worthNow: winScore(skips, penalty),
    worthAfterSkip: winScore(skips + 1, penalty),
  }
}
