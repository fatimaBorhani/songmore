// پخش «شعر یادت نره»: دو کلیپ پشت هم روی یه خط زمانی
//   کلیپ اول: از ۰ تا questionAtMs (قبل از سؤال)
//   کلیپ دوم: از questionAtMs تا endMs (فقط بعد از جواب دادن)
// now = الان کجای این خط زمانی‌ایم (میلی‌ثانیه)
import { useCallback, useEffect, useRef, useState } from 'react'
import { getPlaybackPosition, playClip, stopClip } from '../song/audioPlayer.js'

export function useLyricsPlayer() {
  const [now, setNow] = useState(0)
  const [playing, setPlaying] = useState(false)
  const base = useRef(0) // کلیپی که پخش می‌شه از کجای خط زمانی شروع می‌شه
  const frame = useRef(0)
  const runId = useRef(0) // هر پخش تازه یه شماره؛ پخش‌های قدیمی دیگه کاری نمی‌کنن

  // هر فریم: جای پخش رو بخون (تا وقتی stop یا پخش تازه‌ای نیومده)
  const startLoop = useCallback(() => {
    function step() {
      const pos = getPlaybackPosition()
      if (pos !== null) setNow(base.current + pos * 1000)
      frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }, [])

  const stop = useCallback(() => {
    runId.current += 1
    cancelAnimationFrame(frame.current)
    stopClip()
    setPlaying(false)
  }, [])

  // url رو از ثانیه‌ی offsetMs پخش کن؛ baseMs = این کلیپ از کجای خط زمانی شروع می‌شه
  const play = useCallback(
    (url, offsetMs, baseMs, onEnded) => {
      const id = ++runId.current
      cancelAnimationFrame(frame.current)
      base.current = baseMs
      setNow(baseMs + offsetMs)
      setPlaying(true)
      playClip(url, offsetMs / 1000, () => {
        if (id !== runId.current) return
        cancelAnimationFrame(frame.current)
        setPlaying(false)
        onEnded?.()
      }).catch(() => {
        if (id === runId.current) setPlaying(false)
      })
      startLoop()
    },
    [startLoop]
  )

  // با رفتن از صفحه صدا قطع بشه
  useEffect(() => () => {
    cancelAnimationFrame(frame.current)
    stopClip()
  }, [])

  return { now, setNow, playing, play, stop }
}
