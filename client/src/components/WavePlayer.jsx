import { useEffect, useRef, useState } from 'react'
import { clipUrl } from '../api.js'
import { playClip, stopClip } from '../audioPlayer.js'
import { faNumber } from '../stages.js'

const BAR_COUNT = 48

// ارتفاع میله‌های موج؛ فقط برای ظاهره (موج واقعی آهنگ نیست) و همیشه یکیه
const BAR_HEIGHTS = makeBarHeights()

function makeBarHeights() {
  const heights = []
  let seed = 19
  for (let i = 0; i < BAR_COUNT; i++) {
    seed = (seed * 9301 + 49297) % 233280
    heights.push(Math.round(10 + (seed / 233280) * 50 + Math.abs(Math.sin(i / 3)) * 24))
  }
  return heights
}

// جای یه ثانیه روی موج (از ۰ تا ۱).
// جذری حساب می‌کنیم تا مرحله‌های خیلی کوتاه (مثل ۰٫۱۵ ثانیه) هم دیده بشن.
function barPosition(seconds) {
  return Math.sqrt(seconds / 15)
}

// کارت پخش: موج صدا + دکمه‌ی پخش. همیشه آخرین مرحله‌ی بازشده رو پخش می‌کنه.
// والد با key عوضش می‌کنه، پس با هر مرحله‌ی جدید از صفر شروع می‌شه.
function WavePlayer({ clips, onError }) {
  const clip = clips[clips.length - 1]
  const limit = clip.stage
  const [pos, setPos] = useState(0) // چند ثانیه پخش شده
  const [playing, setPlaying] = useState(false)
  const frameRef = useRef(null)

  // وقتی کارت از صفحه برداشته شد (مرحله یا آهنگ عوض شد)، صدا رو قطع کن
  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current)
      stopClip()
    }
  }, [])

  function stop() {
    cancelAnimationFrame(frameRef.current)
    stopClip()
    setPlaying(false)
  }

  async function handlePlay() {
    if (playing) {
      stop()
      return
    }
    setPos(0)
    setPlaying(true)
    try {
      await playClip(clipUrl(clip.file))
    } catch {
      setPlaying(false)
      onError()
      return
    }

    // هر فریم، زمان گذشته رو حساب کن و نوار رو جلو ببر
    const start = performance.now()
    function tick() {
      const seconds = (performance.now() - start) / 1000
      if (seconds >= limit) {
        setPos(limit)
        setPlaying(false)
        return
      }
      setPos(seconds)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  const playedUntil = barPosition(pos)
  const openUntil = barPosition(limit)

  return (
    <section className="player" aria-label="پخش کلیپ">
      <div className="player-card">
        <div className="player-head">
          <span className="player-stage">
            مرحله‌ی {faNumber(clips.length)} از ۵
          </span>
          <span className="player-time" dir="ltr">
            <strong>{pos.toFixed(2)}</strong> / {limit}s
          </span>
        </div>

        <div
          className="wave"
          dir="ltr"
          role="progressbar"
          aria-label="مقدار پخش‌شده از آهنگ"
          aria-valuemin={0}
          aria-valuemax={15}
          aria-valuenow={Number(pos.toFixed(2))}
        >
          {BAR_HEIGHTS.map((height, i) => {
            const p = (i + 0.5) / BAR_COUNT
            // پخش‌شده (آبی)، بازشده (روشن)، یا هنوز قفل (تیره)
            let state = 'locked'
            if (pos > 0 && p <= playedUntil) state = 'played'
            else if (p <= openUntil) state = 'open'
            return <span key={i} className={`wave-bar ${state}`} style={{ height }} />
          })}
        </div>
      </div>

      <button
        type="button"
        className="play-button"
        onClick={handlePlay}
        aria-label={playing ? 'توقف' : 'پخش'}
      >
        {playing ? (
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 4.5v15l12-7.5z" />
          </svg>
        )}
      </button>
    </section>
  )
}

export default WavePlayer
