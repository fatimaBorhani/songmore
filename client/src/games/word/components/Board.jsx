// صفحه‌ی حرف‌ها: maxGuesses ردیف، هر ردیف wordLength خونه (۳، ۴ یا ۵ حرفی)
//   ردیف‌های حدس‌زده‌شده با رنگ، ردیف فعلی با حرف‌هایی که داره تایپ می‌شه، بقیه خالی
// rowCount: تعداد ردیف‌ها. معمولاً همون maxGuesses؛ توی «حالت ادامه» (بعد از ۶ حدس) با هر حدس یه ردیف بیشتر
// revealRow: ردیفی که همین الان ثبت شده و کاشی‌هاش یکی‌یکی برمی‌گردن
// winRow: ردیف برنده که کاشی‌هاش بالا پایین می‌پرن
// shake: ردیف فعلی تکون بخوره (مثلاً حروف کافی نیست)
import { useLayoutEffect, useRef } from 'react'
import { REVEAL_STEP_MS } from '../timing.js'

const RESULT_LABELS = { correct: 'درست', present: 'جاش فرق داره', absent: 'نیست' }

function Board({ guesses, typed, maxGuesses, rowCount = maxGuesses, wordLength, finished, revealRow, winRow, shake }) {
  const extra = rowCount > maxGuesses
  const viewport = useRef(null)

  // «حالت ادامه»: اندازه‌ی خونه‌ها همون می‌مونه و فقط ۶ ردیفِ آخر دیده می‌شن (بقیه با اسکرول). این‌طوری
  // کیبورد همیشه جاش رو داره. قاب رو به اندازه‌ی ۶ ردیف می‌بندیم و همیشه می‌ره روی آخرین ردیف
  useLayoutEffect(() => {
    const box = viewport.current
    const board = box?.firstElementChild
    if (!box || !board) return undefined
    function fit() {
      const sixth = board.children[maxGuesses - 1]
      if (!extra || !sixth) {
        box.style.maxHeight = ''
        return
      }
      const height = sixth.getBoundingClientRect().bottom - board.getBoundingClientRect().top
      box.style.maxHeight = `${Math.ceil(height) + 4}px`
      box.scrollTop = box.scrollHeight
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(board)
    return () => observer.disconnect()
  }, [extra, rowCount, maxGuesses])

  const rows = []
  for (let r = 0; r < rowCount; r++) {
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

  return (
    <div ref={viewport} className={`board-viewport${extra ? ' scrolling' : ''}`}>
      <div className="board" style={{ '--cols': wordLength, '--rows': maxGuesses }}>
        {rows}
      </div>
    </div>
  )
}

export default Board
