import { useEffect, useRef, useState } from 'react'
import { clipUrl } from '../api.js'
import { getPlaybackPosition, playClip, stopClip } from '../audioPlayer.js'
import { faNumber, faSeconds } from '../stages.js'

const BAR_COUNT = 48
const MAX_SECONDS = 15
const KEY_STEP = 0.1 // هر بار زدن کلید جهت، چند ثانیه جابه‌جا بشه

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
  return Math.sqrt(seconds / MAX_SECONDS)
}

// برعکس barPosition: جای روی موج (۰ تا ۱) -> ثانیه
function secondsAt(fraction) {
  return MAX_SECONDS * fraction * fraction
}

// کارت پخش: موج صدا + دکمه‌ی پخش. همیشه آخرین مرحله‌ی بازشده رو پخش می‌کنه.
// از مرحله‌ی دوم به بعد، با کشیدن روی موج می‌شه جای پخش رو عوض کرد:
// موقع کشیدن فقط خط سفید جابه‌جا می‌شه، با ول کردن از همون‌جا تا آخر مرحله پخش می‌شه.
// والد با key عوضش می‌کنه، پس با هر مرحله‌ی جدید از صفر شروع می‌شه.
function WavePlayer({ clips, onError }) {
  const clip = clips[clips.length - 1]
  const limit = clip.stage
  const seekable = clips.length >= 2 // مرحله‌ی اول (۰٫۱۵ ثانیه) برای جابه‌جا کردن خیلی کوتاهه

  const [pos, setPos] = useState(0) // جای فعلی پخش (ثانیه)
  const [playing, setPlaying] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [hoverSec, setHoverSec] = useState(null) // ثانیه‌ی زیر موس (برای برچسب)
  const frameRef = useRef(null)
  const waveRef = useRef(null)

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

  // از ثانیه‌ی from تا آخر مرحله پخش کن
  async function playFrom(from) {
    stop()
    setPos(from)
    setPlaying(true)
    try {
      await playClip(
        clipUrl(clip.file),
        from,
        () => {
          // پخش به آخر مرحله رسید
          cancelAnimationFrame(frameRef.current)
          setPos(limit)
          setPlaying(false)
        },
        limit,
      )
    } catch {
      setPlaying(false)
      onError()
      return
    }

    // هر فریم جای پخش رو از ساعت خود Web Audio بخون و خط رو جلو ببر
    function tick() {
      const current = getPlaybackPosition()
      if (current === null) return
      setPos(Math.min(current, limit))
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  function handlePlay() {
    if (playing) {
      stop()
      return
    }
    // اگه به آخر رسیده بود از اول، وگرنه از همون‌جایی که خط سفیده
    playFrom(pos >= limit - 0.01 ? 0 : pos)
  }

  // ثانیه‌ی زیر موس/انگشت، محدود به بخشی که باز شده
  function secondsFromEvent(e) {
    const rect = waveRef.current.getBoundingClientRect()
    // موج همیشه چپ‌به‌راسته (حتی توی صفحه‌ی راست‌به‌چپ)، پس از لبه‌ی چپ حساب می‌کنیم
    const fraction = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    return Math.min(secondsAt(fraction), limit)
  }

  function handlePointerDown(e) {
    if (!seekable) return
    // موس روی موج قفل بشه، تا اگه موقع کشیدن از روش بیرون رفت هم کار کنه
    e.currentTarget.setPointerCapture(e.pointerId)
    stop() // موقع کشیدن صدایی پخش نمی‌شه
    setDragging(true)
    setPos(secondsFromEvent(e))
  }

  function handlePointerMove(e) {
    if (!seekable) return
    const seconds = secondsFromEvent(e)
    if (e.pointerType === 'mouse') setHoverSec(seconds)
    if (dragging) setPos(seconds)
  }

  function handlePointerUp(e) {
    if (!dragging) return
    setDragging(false)
    playFrom(secondsFromEvent(e)) // با ول کردن، از همون نقطه پخش کن
  }

  function handlePointerCancel() {
    setDragging(false)
  }

  // کیبورد: کلیدهای جهت خط رو جابه‌جا می‌کنن، Enter یا Space از همون‌جا پخش می‌کنه
  function handleKeyDown(e) {
    if (!seekable) return
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = pos + KEY_STEP
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = pos - KEY_STEP
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = limit
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      playFrom(pos >= limit - 0.01 ? 0 : pos)
      return
    }
    if (next === null) return
    e.preventDefault()
    stop()
    setPos(Math.min(Math.max(next, 0), limit))
  }

  const playedUntil = barPosition(pos)
  const openUntil = barPosition(limit)
  const showHead = seekable && (pos > 0 || dragging)
  // برچسب ثانیه: موقع کشیدن جای خط، وگرنه جای موس
  const labelSec = dragging ? pos : hoverSec

  // ویژگی‌های دسترس‌پذیری: از مرحله‌ی دوم یه اسلایدره، قبلش فقط نوار پیشرفت
  const a11y = seekable
    ? {
        role: 'slider',
        tabIndex: 0,
        'aria-label': 'جای پخش',
        'aria-valuemin': 0,
        'aria-valuemax': limit,
        'aria-valuenow': Number(pos.toFixed(2)),
        'aria-valuetext': `${faSeconds(pos)} ثانیه از ${faSeconds(limit)}`,
      }
    : {
        role: 'progressbar',
        'aria-label': 'مقدار پخش‌شده از آهنگ',
        'aria-valuemin': 0,
        'aria-valuemax': limit,
        'aria-valuenow': Number(pos.toFixed(2)),
      }

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
          ref={waveRef}
          className={`wave ${seekable ? 'seekable' : ''} ${dragging ? 'dragging' : ''}`}
          dir="ltr"
          {...a11y}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={() => setHoverSec(null)}
          onKeyDown={handleKeyDown}
        >
          {BAR_HEIGHTS.map((height, i) => {
            const p = (i + 0.5) / BAR_COUNT
            // پخش‌شده (آبی)، بازشده (روشن)، یا هنوز قفل (تیره)
            let state = 'locked'
            if (pos > 0 && p <= playedUntil) state = 'played'
            else if (p <= openUntil) state = 'open'
            return <span key={i} className={`wave-bar ${state}`} style={{ height }} />
          })}

          {/* روی بخش قفل، شکل موس «ممنوع» می‌شه */}
          {seekable && (
            <span className="wave-locked-zone" style={{ left: `${openUntil * 100}%` }} aria-hidden="true" />
          )}

          {/* خط سفید جای پخش */}
          {showHead && (
            <span className="wave-head" style={{ left: `${playedUntil * 100}%` }} aria-hidden="true" />
          )}

          {/* برچسب ثانیه بالای موس */}
          {seekable && labelSec !== null && (
            <span className="wave-label" style={{ left: `${barPosition(labelSec) * 100}%` }} aria-hidden="true">
              {labelSec.toFixed(2)}s
            </span>
          )}
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
