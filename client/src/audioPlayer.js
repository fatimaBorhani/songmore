// پخش کلیپ‌ها با Web Audio API
let audioContext = null
const bufferCache = new Map() // url -> AudioBuffer دیکد شده (برای پخش دوباره بدون دانلود مجدد)
let currentSource = null

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
    try {
      currentSource.stop()
    } catch {
      // اگه از قبل تموم شده بود، مهم نیست
    }
    currentSource = null
  }
}

export async function playClip(url) {
  stopClip()
  const ctx = getContext()
  if (ctx.state === 'suspended') await ctx.resume()
  const buffer = await loadBuffer(url)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start(0)
  currentSource = source
}
