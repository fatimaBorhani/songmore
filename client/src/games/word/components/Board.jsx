// صفحه‌ی حرف‌ها: ۶ ردیف ۵ تایی
//   ردیف‌های حدس‌زده‌شده با رنگ، ردیف فعلی با حرف‌هایی که داره تایپ می‌شه، بقیه خالی
// revealRow: ردیفی که همین الان ثبت شده و کاشی‌هاش یکی‌یکی برمی‌گردن
// winRow: ردیف برنده که کاشی‌هاش بالا پایین می‌پرن
// shake: ردیف فعلی تکون بخوره (مثلاً حروف کافی نیست)
import { REVEAL_STEP_MS } from '../timing.js'

const RESULT_LABELS = { correct: 'درست', present: 'جاش فرق داره', absent: 'نیست' }

function Board({ guesses, typed, maxGuesses, wordLength, finished, revealRow, winRow, shake }) {
  const rows = []
  for (let r = 0; r < maxGuesses; r++) {
    const guess = guesses[r]
    const isCurrent = !finished && r === guesses.length
    const tiles = []
    for (let i = 0; i < wordLength; i++) {
      let className = 'tile'
      let letter = ''
      const style = {}
      if (guess) {
        letter = guess.letters[i].letter
        className += ` ${guess.letters[i].result}`
        if (r === revealRow) {
          className += ' reveal'
          style.animationDelay = `${i * REVEAL_STEP_MS}ms`
        }
        if (r === winRow) style.animationDelay = `${i * 90}ms`
      } else if (isCurrent && typed[i]) {
        letter = typed[i]
        className += ' filled'
      } else if (isCurrent && i === typed.length) {
        className += ' cursor'
      } else if (!isCurrent) {
        className += ' future'
      }
      tiles.push(
        <span key={i} className={className} style={style} aria-hidden="true">
          {letter}
        </span>
      )
    }

    // متن ردیف برای صفحه‌خوان‌ها
    let label = `ردیف ${r + 1}: خالی`
    if (guess) {
      label = `ردیف ${r + 1}: ${guess.word}، ${guess.letters.map((l) => `${l.letter} ${RESULT_LABELS[l.result]}`).join('، ')}`
    } else if (isCurrent && typed.length) {
      label = `ردیف ${r + 1}: در حال تایپ ${typed.join('')}`
    }

    let rowClass = 'board-row'
    if (isCurrent && shake) rowClass += ' shake'
    if (r === winRow) rowClass += ' win'
    rows.push(
      <div key={r} className={rowClass} role="group" aria-label={label}>
        {tiles}
      </div>
    )
  }

  return <div className="board">{rows}</div>
}

export default Board
