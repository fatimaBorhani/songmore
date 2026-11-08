// کارت آخر بازی: کلمه‌ی امروز، نتیجه، اشتراک و زمان تا کلمه‌ی بعدی
import { useEffect, useRef } from 'react'
import { faNumber } from '../../../shared/format.js'
import Countdown from '../../../shared/components/Countdown.jsx'

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
