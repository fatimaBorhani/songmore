// صداهای بازی حافظه‌ی رنگ با Web Audio (بدون فایل صوتی): تیک ثانیه‌ها، ناپدید شدن رنگ و اعلام امتیاز
// خاموش/روشن بودن صدا توی localStorage مرورگر می‌مونه
const MUTE_KEY = 'songmore_color_muted'
let ctx = null

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // اگه مرورگر اجازه نده مهم نیست
  }
}

// مرورگرها فقط بعد از کلیک کاربر اجازه‌ی پخش صدا می‌دن؛ اینو توی کلیک «شروع» صدا می‌زنیم
export function unlockSound() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    ctx = new AudioCtx()
  }
  if (ctx.state === 'suspended') ctx.resume()
}

// یه نت کوتاه: freq فرکانس، delay چند ثانیه بعد، length طول، volume بلندی
function note(freq, { delay = 0, length = 0.12, volume = 0.15, type = 'sine' } = {}) {
  if (!ctx || isMuted()) return
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

// تیک هر ثانیه‌ی شمارش معکوس؛ ثانیه‌ی آخر زیرتر
export function playTick(secondsLeft) {
  note(secondsLeft <= 1 ? 1040 : 780, { length: 0.07, volume: 0.12, type: 'triangle' })
}

// رنگ ناپدید شد: دو نت پایین‌رونده
export function playHide() {
  note(660, { length: 0.12 })
  note(440, { delay: 0.11, length: 0.2 })
}

// اعلام امتیاز (از ۱۰): هرچی امتیاز بیشتر، نت‌های بیشتر و بالاتر
export function playScore(score) {
  const scale = [523, 659, 784, 1047, 1319]
  const count = Math.max(1, Math.min(scale.length, Math.round(score / 2)))
  for (let i = 0; i < count; i++) note(scale[i], { delay: i * 0.09, length: 0.22, volume: 0.13 })
}
