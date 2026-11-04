// تاریخ امروز به وقت تهران (مشترک بین همه‌ی بازی‌ها؛ بازی‌های روزانه نیمه‌شب تهران عوض می‌شن)
export function getTodayDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type).value
  return `${get('year')}-${get('month')}-${get('day')}`
}
