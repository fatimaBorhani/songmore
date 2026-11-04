// کارت آخر بازی: کلمه‌ی امروز، نتیجه، اشتراک و زمان تا کلمه‌ی بعدی
import { useEffect, useRef, useState } from 'react'
import { faDigits, faNumber } from '../../../shared/format.js'

// چند ثانیه تا نیمه‌شب تهران (کلمه‌ی جدید)
function secondsToTehranMidnight() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (type) => Number(parts.find((p) => p.type === type).value)
  return 24 * 3600 - (get('hour') * 3600 + get('minute') * 60 + get('second'))
}

function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return faDigits([h, m, s].map((n) => String(n).padStart(2, '0')).join(':'))
}

function Countdown() {
  const [seconds, setSeconds] = useState(secondsToTehranMidnight)
  useEffect(() => {
    const timer = setInterval(() => setSeconds(secondsToTehranMidnight()), 1000)
    return () => clearInterval(timer)
  }, [])
  return <b>{formatClock(seconds)}</b>
}

const PRAISE = ['نابغه!', 'فوق‌العاده!', 'عالی بود!', 'آفرین!', 'خوب بود!', 'به موقع!']

function WordResult({ game, onShare, testMode, onReplay }) {
  const count = game.guesses.length
  const card = useRef(null)
  // روی گوشی‌های کوچیک اگه کارت پایین‌تر از صفحه افتاد، خودش بیاد توی دید
  useEffect(() => {
    card.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])
  return (
    <section ref={card} className="word-result" aria-live="polite">
      <div className="word-result-head">
        {game.won ? (
          <p className="word-result-message won">
            {PRAISE[count - 1]} در حدس {faNumber(count)} پیدا کردی
          </p>
        ) : (
          <p className="word-result-message">این بار نشد. کلمه‌ی امروز این بود:</p>
        )}
        <h2 className="word-result-answer">{game.answer}</h2>
      </div>

      <div className="word-result-actions">
        <button type="button" className="primary-button" onClick={onShare}>
          اشتراک نتیجه
        </button>
        {testMode && (
          <button type="button" className="ghost-button" onClick={onReplay}>
            بازی دوباره (تست)
          </button>
        )}
      </div>

      <p className="word-next">
        کلمه‌ی بعدی تا <Countdown />
      </p>
    </section>
  )
}

export default WordResult
