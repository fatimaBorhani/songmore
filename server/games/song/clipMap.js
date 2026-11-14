// چک شکل data/clip_map.json: هر آهنگ باید یه دیکشنری «مرحله ← اسم فایل کلیپ» باشه، مثل
//   "9f2f6afc": { "0.15": "e0ad5d030d8bdd6b.mp3", "0.5": "...", "2": "...", "8": "...", "15": "..." }
// اگه یه اسکریپت دیگه (مثلاً ثبت اثر انگشت فایل‌ها) چیز دیگه‌ای توی این فایل بنویسه، seed بی‌صدا اطلاعات آشغال
// وارد دیتابیس می‌کرد؛ برای همین قبل از seed چک می‌کنیم.

// ورودی درست: یه شیء غیرخالی که همه‌ی مقدارهاش اسم فایل (متن غیرخالی) باشن
export function isValidClipEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false
  const names = Object.values(entry)
  return names.length > 0 && names.every((n) => typeof n === 'string' && n.length > 0)
}

// شناسه‌ی آهنگ‌هایی که ورودی‌شون شکل درست نداره
export function badClipEntries(clipMap) {
  return Object.keys(clipMap).filter((id) => !isValidClipEntry(clipMap[id]))
}

// اگه clip_map شکل درست نداره خطا می‌ده (با پیام فارسی)
export function assertClipMapOk(clipMap) {
  const bad = badClipEntries(clipMap)
  if (bad.length === 0) return
  const total = Object.keys(clipMap).length
  throw new Error(
    `data/clip_map.json شکل درست نداره: ${bad.length} ورودی از ${total} تا باید «مرحله ← اسم فایل» باشن ` +
      `(مثلاً ${bad[0]}: ${JSON.stringify(clipMap[bad[0]])}). seed انجام نشد. ` +
      'نسخه‌ی سالم رو با «git restore data/clip_map.json» برگردون.'
  )
}
