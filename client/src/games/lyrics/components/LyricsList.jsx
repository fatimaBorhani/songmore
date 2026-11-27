import { useEffect, useRef, useState } from 'react'
import { GRADE_LABELS, lineState } from '../lyrics.js'

const RESUME_MS = 5000 // بعد از اسکرول دستی، این‌قدر بعد خودش دوباره دنبال خط جاری می‌ره

const MARKS = {
  ok: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M4 10c2.5-3 5-3 8 0s5.5 3 8 0M4 16c2.5-3 5-3 8 0s5.5 3 8 0" />,
  wrong: <path d="M6 6l12 12M18 6L6 18" />,
}

// لیست ترانه، از نظر کار کردن مثل اسپاتیفای:
// - همه‌ی خط‌ها توی یه لیست قابل اسکرول؛ خط جاری پررنگ، خونده‌شده کم‌رنگ، بعدی کم‌رنگ‌تر
// - خودش دنبال خط جاری می‌ره (حدود یه‌سوم بالای ستون)
// - اگه بازیکن خودش اسکرول کنه، دنبال کردن می‌ایسته و دکمه‌ی «برگرد» میاد؛ ۵ ثانیه بعد خودش برمی‌گرده
// - زدن روی هر خط از همون‌جا پخش می‌کنه
// slot: تیکه (lines و answerIndex)، current: خط جاری یا -1، followKey: هر وقت عوض شه دوباره دنبال می‌کنه
// blanks: جای خالیِ دو خط جواب (موقع پخش اول)؛ children: فرم جواب (توی نوبت تو)
function LyricsList({ slot, current, followKey, blanks, onLine, backText, children }) {
  const box = useRef(null)
  const [detached, setDetached] = useState(false)
  const resumeTimer = useRef(0)

  function follow(smooth = true) {
    const el = box.current?.querySelector('[data-follow="true"]')
    if (!el) return
    const top = el.offsetTop - box.current.clientHeight * 0.35
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    box.current.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduce ? 'smooth' : 'auto' })
  }

  // هر وقت خط جاری (یا مرحله) عوض شد، اگه بازیکن خودش اسکرول نکرده، دنبالش برو
  useEffect(() => {
    if (!detached) follow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followKey, detached])

  useEffect(() => () => clearTimeout(resumeTimer.current), [])

  function detach() {
    clearTimeout(resumeTimer.current)
    setDetached(true)
    resumeTimer.current = setTimeout(() => setDetached(false), RESUME_MS)
  }

  function reattach() {
    clearTimeout(resumeTimer.current)
    setDetached(false)
  }

  function playLine(line) {
    reattach()
    onLine(line.ms)
  }

  const revealed = slot.finished
  const answerAt = slot.answerIndex
  // جای دنبال کردن وقتی هیچ خطی پخش نمی‌شه: فرم جواب، یا اولین خط جواب
  const followIndex = current >= 0 ? current : revealed ? answerAt : -1

  return (
    <div className="lyrics-listwrap">
      <div className="lyrics-list" ref={box} onWheel={detach} onTouchMove={detach}>
        <div className="lyrics-list-inner">
          {slot.lines.map((line, i) => {
            const isAnswer = revealed && (i === answerAt || i === answerAt + 1)
            const grade = isAnswer ? slot.grades[i - answerAt] : null
            const typed = isAnswer ? slot.typed[i - answerAt] : ''
            return (
              <div key={i} className={`lyrics-line ${lineState(i, current, isAnswer)}`} data-follow={i === followIndex}>
                {grade && (
                  <span className={`lyrics-mark ${grade}`} role="img" aria-label={GRADE_LABELS[grade]}>
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      {MARKS[grade]}
                    </svg>
                  </span>
                )}
                <div className="lyrics-line-text">
                  <button type="button" className="lyrics-line-button" onClick={() => playLine(line)} aria-label={`پخش از این خط: ${line.text}`}>
                    <span className="lyrics-line-play" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
                      </svg>
                    </span>
                    {line.text}
                  </button>
                  {grade && grade !== 'ok' && typed && <span className="lyrics-typed">{typed}</span>}
                </div>
              </div>
            )
          })}
          {blanks && (
            <>
              <div className="lyrics-blank" aria-hidden="true" />
              <div className="lyrics-blank short" aria-hidden="true" />
            </>
          )}
          {children && (
            <div className="lyrics-form-slot" data-follow={followIndex === -1}>
              {children}
            </div>
          )}
        </div>
      </div>
      {detached && (
        <button type="button" className="lyrics-back" onClick={reattach}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
          {backText}
        </button>
      )}
    </div>
  )
}

export default LyricsList
