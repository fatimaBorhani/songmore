import { useState } from 'react'

const RESULT_EMOJI = { correct: '🟩', present: '🟨', incorrect: '🟥', skipped: '⬜' }

function buildShareText(guesses) {
  const squares = Array.from({ length: 5 }, (_, i) => {
    const g = guesses[i]
    return g ? RESULT_EMOJI[g.result] : '⬛'
  }).join('')
  return `بازی حدس آهنگ\n${squares}`
}

// پیام پایان بازی: جواب و دکمه‌ی کپی نتیجه برای اشتراک‌گذاری
function GameOver({ answer, guesses }) {
  const won = guesses.some((g) => g.result === 'correct')
  const [copied, setCopied] = useState(false)

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(buildShareText(guesses))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // کپی خودکار همه‌جا کار نمی‌کنه؛ مشکلی نیست
    }
  }

  return (
    <div className="game-over">
      <h2>{won ? 'بردی! 🎉' : 'این دفعه نه 😅'}</h2>
      <p className="answer">
        {answer.title}
        {answer.altTitle ? ` (${answer.altTitle})` : ''} — {answer.credit}
      </p>
      <button type="button" onClick={copyResult}>
        {copied ? 'کپی شد ✅' : 'کپی نتیجه برای اشتراک‌گذاری'}
      </button>
    </div>
  )
}

export default GameOver
