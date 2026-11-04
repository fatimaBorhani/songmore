// قالب‌بندی عددها با رقم فارسی (مشترک بین همه‌ی بازی‌ها)

// عدد با رقم فارسی؛ digits = تعداد رقم اعشار
export function faNumber(n, digits = 0) {
  return n.toLocaleString('fa-IR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

// ثانیه به شکل خوانا: زیر ۱ ثانیه دو رقم اعشار، بقیه بدون اعشار
export function faSeconds(n) {
  return faNumber(n, n < 1 ? 2 : 0)
}

// رقم‌های انگلیسی یه متن -> فارسی (مثلاً برای ساعت ۰۸:۱۲:۴۰)
export function faDigits(text) {
  return String(text).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])
}
