// کپی متن (برای «کپی نتیجه» همه‌ی بازی‌ها)
// navigator.clipboard فقط روی آدرس امن کار می‌کنه (https یا localhost)؛ روی گوشی با آدرس وای‌فای
// (مثل http://192.168.1.5:5173) اصلاً وجود نداره. پس اگه نشد، راه قدیمی رو امتحان می‌کنیم:
// متن رو توی یه جعبه‌ی متن نامرئی می‌ذاریم، انتخابش می‌کنیم و دستور copy مرورگر رو می‌زنیم.
// خروجی: true اگه کپی شد، false اگه هیچ راهی جواب نداد

export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // مثلاً مرورگر اجازه نداد؛ می‌ریم سراغ راه قدیمی
    }
  }
  return copyWithTextarea(text)
}

function copyWithTextarea(text) {
  const box = document.createElement('textarea')
  box.value = text
  box.setAttribute('readonly', '')
  // بیرون از صفحه، با فونت ۱۶ تا آیفون موقع انتخاب زوم نکنه
  box.style.position = 'fixed'
  box.style.top = '-1000px'
  box.style.opacity = '0'
  box.style.fontSize = '16px'
  document.body.appendChild(box)
  const active = document.activeElement
  box.focus()
  box.select()
  box.setSelectionRange(0, text.length) // آیفون با select() تنها همه‌ی متن رو انتخاب نمی‌کنه
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(box)
  active?.focus?.()
  return ok
}

// اشتراک با منوی خود گوشی (اگه هست، که فقط روی آدرس امنه)؛ true اگه اشتراک انجام شد
export async function shareText(text) {
  if (!navigator.share || !window.isSecureContext) return false
  try {
    await navigator.share({ text })
    return true
  } catch {
    return false // کاربر بستش یا نشد
  }
}
