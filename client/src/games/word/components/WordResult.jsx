// کارت آخر هر کلمه: جواب، نتیجه و دکمه‌ی کلمه‌ی بعدی. بعد از کلمه‌ی آخر: خلاصه‌ی روز، اشتراک و زمان تا کلمه‌های فردا
import { useEffect, useRef } from 'react'
import { faNumber } from '../../../shared/format.js'
import Countdown from '../../../shared/components/Countdown.jsx'

const PRAISE = ['نابغه!', 'فوق‌العاده!', 'عالی بود!', 'آفرین!', 'خوب بود!', 'به موقع!']

function WordResult({ game, onShare, onNext, testMode, onReplay }) {
  const count = game.guesses.length
  const card = useRef(null)
  // روی گوشی‌های کوچیک اگه کارت پایین‌تر از صفحه افتاد، خودش بیاد توی دید
  useEffect(() => {
    card.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])
  const nextSlot = game.slots[game.slot] // کلمه‌ی بعدی (اگه هست)
  return (
    <section ref={card} className="word-result" aria-live="polite">
      <div className="word-result-head">
        {game.won ? (
          <p className="word-result-message won">
            {PRAISE[count - 1] || PRAISE.at(-1)} در حدس {faNumber(count)} پیدا کردی
          </p>
        ) : (
          <p className="word-result-message">این بار نشد. کلمه‌ی {faNumber(game.wordLength)} حرفی این بود:</p>
        )}
        <h2 className="word-result-answer">{game.answer}</h2>
      </div>

      {game.dayFinished && (
        <ul className="word-day-summary" aria-label="خلاصه‌ی امروز">
          {game.slots.map((s) => (
            <li key={s.slot} className={s.won ? 'won' : 'lost'}>
              <span className="day-len">{faNumber(s.length)} حرفی</span>
              <span className="day-word">{s.answer}</span>
              <span className="day-score">{s.won ? `${faNumber(s.guessCount)}/${faNumber(s.maxGuesses)}` : `✕/${faNumber(s.maxGuesses)}`}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="word-result-actions">
        {game.dayFinished ? (
          <button type="button" className="primary-button" onClick={onShare}>
            اشتراک نتیجه
          </button>
        ) : (
          <button type="button" className="primary-button" onClick={onNext} autoFocus>
            کلمه‌ی {faNumber(nextSlot.length)} حرفی
          </button>
        )}
        {game.dayFinished && testMode && (
          <button type="button" className="ghost-button" onClick={onReplay}>
            بازی دوباره (تست)
          </button>
        )}
      </div>

      {game.dayFinished && (
        <p className="word-next">
          کلمه‌های بعدی تا <Countdown />
        </p>
      )}
    </section>
  )
}

export default WordResult
