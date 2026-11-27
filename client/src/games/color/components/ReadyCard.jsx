// قبل از هر دور: سه تا کارت پشت‌ورو با «؟»؛ رنگ دور پشت کارت بالاییه (تا کاربر آماده نباشه رنگ نشون داده نمی‌شه)
// با «برگردونش!» اول کارت‌ها جمع می‌شن (حدود ۰٫۳۵ ثانیه) و بعد رنگ از وسط کارت روی صفحه پخش می‌شه (MemorizeCard)
import { useState } from 'react'
import { faNumber } from '../../../shared/format.js'

const LEAVE_MS = 350 // باید با انیمیشن color-ready-leave توی color.css یکی باشه

// کاربرهایی که انیمیشن رو خاموش کردن منتظر جمع شدن کارت‌ها نمی‌مونن
function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function ReadyCard({ round, roundCount, busy, onStart }) {
  const [leaving, setLeaving] = useState(false)

  async function start() {
    if (busy || leaving) return
    setLeaving(true)
    if (!reducedMotion()) await new Promise((r) => setTimeout(r, LEAVE_MS))
    await onStart()
    // اگه شروع نشد (مثلاً سرور جواب نداد) کارت‌ها برمی‌گردن سر جاشون
    setLeaving(false)
  }

  return (
    <section className={`color-card color-ready${leaving ? ' leaving' : ''}`} aria-label="شروع دور">
      <div className="color-deck" aria-hidden="true">
        <span className="deck-back one" />
        <span className="deck-back two" />
        <span className="deck-front">
          <b>؟</b>
          <span>
            رنگ {faNumber(round)} از {faNumber(roundCount)}
          </span>
        </span>
      </div>

      <div className="color-ready-bottom">
        <div className="color-ready-text">
          <b>رنگ امروز پشت این کارته</b>
          <span>برش گردون و خوب نگاش کن!</span>
        </div>
        <button type="button" className="color-btn round" disabled={busy || leaving} onClick={start} autoFocus>
          {busy ? 'یه لحظه...' : 'برگردونش!'}
        </button>
      </div>
    </section>
  )
}

export default ReadyCard
