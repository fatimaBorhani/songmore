// مراحل کلیپ (ثانیه)؛ باید با STAGES سرور (server/guesses.js) یکی باشه
export const STAGES = [0.15, 0.5, 2, 8, 15]

// عدد با رقم فارسی؛ digits = تعداد رقم اعشار
export function faNumber(n, digits = 0) {
  return n.toLocaleString('fa-IR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

// ثانیه به شکل خوانا: زیر ۱ ثانیه دو رقم اعشار، بقیه بدون اعشار
export function faSeconds(n) {
  return faNumber(n, n < 1 ? 2 : 0)
}
