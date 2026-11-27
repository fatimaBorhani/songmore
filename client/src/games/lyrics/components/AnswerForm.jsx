import { useEffect, useRef, useState } from 'react'

// دو خانه برای دو خط بعدی + «ثبت جواب». Enter توی خانه‌ی اول می‌ره خانه‌ی دوم.
function AnswerForm({ busy, onSubmit }) {
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const first = useRef(null)
  const second = useRef(null)

  // نوبت که رسید، خانه‌ی اول آماده‌ی نوشتنه
  useEffect(() => {
    const t = setTimeout(() => first.current?.focus({ preventScroll: true }), 350)
    return () => clearTimeout(t)
  }, [])

  const empty = !line1.trim() && !line2.trim()

  function submit(e) {
    e.preventDefault()
    if (empty || busy) return
    onSubmit(line1, line2)
  }

  return (
    <form className="lyrics-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="lyrics-line-1">
        خط اول
      </label>
      <input
        id="lyrics-line-1"
        ref={first}
        className="lyrics-input"
        type="text"
        autoComplete="off"
        maxLength={120}
        placeholder="خط بعدی…"
        value={line1}
        onChange={(e) => setLine1(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            second.current?.focus()
          }
        }}
      />
      <label className="sr-only" htmlFor="lyrics-line-2">
        خط دوم
      </label>
      <input
        id="lyrics-line-2"
        ref={second}
        className="lyrics-input"
        type="text"
        autoComplete="off"
        maxLength={120}
        placeholder="و بعدیش…"
        value={line2}
        onChange={(e) => setLine2(e.target.value)}
      />
      <button type="submit" className="lyrics-submit" disabled={empty || busy}>
        ثبت جواب
      </button>
    </form>
  )
}

export default AnswerForm
