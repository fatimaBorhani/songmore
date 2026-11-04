import { useState } from 'react'
import { STAGES } from '../stages.js'
import { faNumber, faSeconds } from '../../../shared/format.js'
import AnimatedNumber from '../../../shared/components/AnimatedNumber.jsx'

const RESULT_EMOJI = { correct: '🟩', present: '🟨', incorrect: '🟥', skipped: '⬜' }

function buildShareText(guesses, score) {
  const squares = Array.from({ length: 5 }, (_, i) => {
    const g = guesses[i]
    return g ? RESULT_EMOJI[g.result] : '⬛'
  }).join('')
  return `بازی حدس آهنگ\n${squares}\nامتیاز: ${faNumber(score ?? 0)} از ${faNumber(10000)}`
}

// پیام پایان بازی: جواب، چند ثانیه طول کشید، و دکمه‌های کپی نتیجه و آهنگ بعدی.
// onNext فقط توی حالت تست داده می‌شه؛ اگه نباشه دکمه‌ی «آهنگ بعدی» نمیاد.
function GameOver({ answer, guesses, score, onNext, busy, celebrating }) {
  const correctGuess = guesses.find((g) => g.result === 'correct')
  const [copied, setCopied] = useState(false)

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(buildShareText(guesses, score))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // کپی خودکار همه‌جا کار نمی‌کنه؛ مشکلی نیست
    }
  }

  const answerText = `${answer.title}${answer.altTitle ? ` (${answer.altTitle})` : ''} — ${answer.credit}`
  // اگه برده، کنار جواب بنویس توی چند ثانیه پیداش کرد.
  // فقط «رد کردن» مرحله رو جلو می‌بره، پس مرحله = تعداد رد کردن‌های قبل از حدس درست
  let seconds = null
  if (correctGuess) {
    const skipsBefore = guesses.filter(
      (g) => g.result === 'skipped' && g.guess_number < correctGuess.guess_number,
    ).length
    seconds = STAGES[skipsBefore]
  }

  return (
    <section className="game-over">
      <h2 className={celebrating ? 'pop' : ''}>{correctGuess ? 'بردی!' : 'این دفعه نه'}</h2>
      {/* امتیاز؛ لحظه‌ی برد از صفر می‌شمره بالا */}
      <p className={`final-score ${correctGuess ? '' : 'zero'}`}>
        <span className="final-score-value">
          <AnimatedNumber value={score ?? 0} from={celebrating ? 0 : (score ?? 0)} duration={1200} />
        </span>
        <span className="final-score-label">امتیاز</span>
      </p>
      <p className="answer">
        {answerText}
        {seconds !== null && ` · توی ${faSeconds(seconds)} ثانیه`}
      </p>
      <div className="game-over-actions">
        <button type="button" className="primary" onClick={copyResult}>
          {copied ? 'کپی شد' : 'کپی نتیجه'}
        </button>
        {onNext && (
          <button type="button" className="secondary" disabled={busy} onClick={onNext}>
            آهنگ بعدی
          </button>
        )}
      </div>
    </section>
  )
}

export default GameOver
