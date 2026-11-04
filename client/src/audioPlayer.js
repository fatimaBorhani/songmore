// پخش کلیپ‌ها با Web Audio API
let audioContext = null
const bufferCache = new Map() // url -> AudioBuffer دیکد شده (برای پخش دوباره بدون دانلود مجدد)
let currentSource = null
let startedAt = 0 // زمان ساعت Web Audio وقتی پخش فعلی شروع شد
let startOffset = 0 // از چه ثانیه‌ای از کلیپ شروع کردیم

function getContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

async function loadBuffer(url) {
  if (bufferCache.has(url)) return bufferCache.get(url)
  const ctx = getContext()
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  bufferCache.set(url, audioBuffer)
  return audioBuffer
}

export function stopClip() {
  if (currentSource) {
    const source = currentSource
    // اول null می‌کنیم تا onended فکر نکنه پخش خودش تموم شده
    currentSource = null
    try {
      source.stop()
    } catch {
      // اگه از قبل تموم شده بود، مهم نیست
    }
  }
}

// کلیپ رو از ثانیه‌ی offset تا ثانیه‌ی until (یا تا آخر فایل) پخش می‌کنه.
// onEnded فقط وقتی صدا می‌شه که پخش خودش به آخر برسه (نه وقتی ما stop کنیم).
export async function playClip(url, offset = 0, onEnded, until) {
  stopClip()
  const ctx = getContext()
  if (ctx.state === 'suspended') await ctx.resume()
  const buffer = await loadBuffer(url)
  const safeOffset = Math.min(Math.max(offset, 0), buffer.duration)
  // تا کجا پخش بشه؛ حتی اگه فایل از مرحله بلندتر بود، از آخر مرحله جلوتر نره
  const end = Math.min(until ?? buffer.duration, buffer.duration)
  const duration = Math.max(end - safeOffset, 0)

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.onended = () => {
    if (currentSource === source) {
      currentSource = null
      if (onEnded) onEnded()
    }
  }
  source.start(0, safeOffset, duration)
  currentSource = source
  startedAt = ctx.currentTime
  startOffset = safeOffset
}

// الان کجای کلیپیم (ثانیه)؛ اگه چیزی پخش نمی‌شه null
export function getPlaybackPosition() {
  if (!currentSource || !audioContext) return null
  return startOffset + (audioContext.currentTime - startedAt)
}
