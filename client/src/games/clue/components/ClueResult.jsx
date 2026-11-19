import Countdown from '../../../shared/components/Countdown.jsx'
import { faNumber } from '../../../shared/format.js'

// آخر بازی (بدون کارت): «کلمه‌ی امروز»، جواب درشت با یه خط کوتاه زیرش و تعداد حدس و راهنما،
// بعد اشتراک و ساعت کلمه‌ی بعدی. لیست حدس‌های بازیکن (نوارها) زیرش می‌مونه
function ClueResult({ game, onShare }) {
  const hints = game.hintCount > 0 && (
    <>
      {' '}
      و <b>{faNumber(game.hintCount)} راهنما</b>
    </>
  )
  return (
    <section className={`clue-result${game.found ? ' won' : ''}`}>
      <p className="clue-result-label">کلمه‌ی امروز</p>
      <p className="clue-result-answer">{game.answer}</p>
      <span className="clue-result-line" aria-hidden="true" />
      <p className="clue-result-stats">
        {game.found ? 'پیداش کردی با ' : 'تسلیم شدی بعد از '}
        <b>{faNumber(game.guessCount)} حدس</b>
        {hints}
      </p>

      <button type="button" className="clue-share" onClick={onShare}>
        کپی نتیجه
      </button>
      <p className="clue-next">
        کلمه‌ی بعدی تا{' '}
        <span dir="ltr">
          <Countdown />
        </span>
      </p>
    </section>
  )
}

export default ClueResult
