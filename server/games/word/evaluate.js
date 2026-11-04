// رنگ هر حرف حدس، مثل وردل:
//   correct: حرف درست، جای درست
//   present: حرف توی کلمه هست ولی جای دیگه
//   absent:  حرف توی کلمه نیست (یا همه‌ی تکرارهاش قبلاً حساب شدن)
export function evaluateGuess(guess, answer) {
  const g = Array.from(guess)
  const a = Array.from(answer)
  const result = g.map(() => 'absent')

  // دور اول: حرف‌هایی که جاشون درسته. بقیه‌ی حروف جواب رو می‌شمریم.
  const remaining = {}
  a.forEach((ch, i) => {
    if (g[i] === ch) result[i] = 'correct'
    else remaining[ch] = (remaining[ch] || 0) + 1
  })

  // دور دوم: حرف‌هایی که توی کلمه هستن، فقط به تعداد باقی‌مونده.
  // مثلاً اگه جواب یه «ر» داره و حدس دو تا، فقط یکی‌شون رنگ می‌گیره.
  g.forEach((ch, i) => {
    if (result[i] !== 'correct' && remaining[ch] > 0) {
      result[i] = 'present'
      remaining[ch] -= 1
    }
  })
  return result
}
