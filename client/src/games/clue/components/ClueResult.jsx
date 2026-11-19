import Countdown from '../../../shared/components/Countdown.jsx'
import { faNumber } from '../../../shared/format.js'

// کارت آخر بازی: جواب، تعداد حدس و راهنما، کلمه‌های نزدیک به جواب، اشتراک و ساعت کلمه‌ی بعدی
function ClueResult({ game, onShare }) {
  return (
    <section className={`clue-result${game.found ? ' won' : ''}`}>
      <p className="clue-result-label">{game.found ? 'پیداش کردی! کلمه‌ی امروز' : 'جواب امروز این بود'}</p>
      <p className="clue-result-answer">{game.answer}</p>
      <p className="clue-result-stats">
        {faNumber(game.guessCount)} حدس
        {game.hintCount > 0 && <> · {faNumber(game.hintCount)} راهنما</>}
      </p>

      <div className="clue-near">
        <p>نزدیک‌ترین کلمه‌ها به «{game.answer}»</p>
        <ol>
          {game.near.map((n) => (
            <li key={n.rank}>
              {n.word} <b>{faNumber(n.rank)}</b>
            </li>
          ))}
        </ol>
      </div>

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
