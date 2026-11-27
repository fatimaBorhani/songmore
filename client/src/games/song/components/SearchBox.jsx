import { useEffect, useState } from 'react'
import { searchSongs } from '../api.js'
import SongSuggestDialog from './SongSuggestDialog.jsx'

// هم‌شکل MIN_QUERY_LENGTH سرور (search.js): با کمتر از ۲ حرف جستجو نمی‌کنیم
const MIN_QUERY_LENGTH = 2

// تعداد حرف‌های واقعی (بدون فاصله و علامت)
function letterCount(text) {
  return text.replace(/[^\p{L}\p{N}]/gu, '').length
}

// جستجو با تاخیر کوتاه (debounce) تا هر حرف مستقیم به سرور نره.
// آخر لیست نتیجه‌ها همیشه «آهنگت توی لیست نیست؟» میاد که پنجره‌ی پیشنهاد آهنگ رو باز می‌کنه
function SearchBox({ disabled, onChoose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchedFor, setSearchedFor] = useState('') // جستجوی کدوم متن تموم شده
  const [suggesting, setSuggesting] = useState(null) // متنی که پنجره‌ی پیشنهاد باهاش باز شده

  useEffect(() => {
    // جعبه خالیه یا خیلی کوتاهه: لیست خودش نشون داده نمی‌شه (showList)، لازم نیست چیزی پاک بشه
    if (letterCount(query) < MIN_QUERY_LENGTH) return

    let active = true // اگه متن عوض شد، جواب قدیمی دیر رسیده رو نادیده بگیر
    const timer = setTimeout(async () => {
      const found = await searchSongs(query).catch(() => [])
      if (!active) return
      setResults(found)
      setSearchedFor(query)
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query])

  function changeQuery(event) {
    const nextQuery = event.target.value
    setQuery(nextQuery)
    if (!nextQuery.trim()) setResults([])
  }

  function choose(song) {
    onChoose(song)
    setQuery('')
    setResults([])
  }

  function openSuggest() {
    setSuggesting(query.trim())
    setQuery('')
    setResults([])
  }

  // لیست فقط وقتی میاد که جستجوی همین متن تموم شده باشه (تا «پیدا نشد» زودتر از نتیجه‌ها نیاد)
  const showList = letterCount(query) >= MIN_QUERY_LENGTH && searchedFor === query

  return (
    <div className="search-box">
      <input
        type="text"
        placeholder="اسم آهنگ یا خواننده..."
        value={query}
        disabled={disabled}
        onChange={changeQuery}
      />
      {showList && (
        <ul className="search-results">
          {results.map((song) => (
            <li key={song.id}>
              <button type="button" onClick={() => choose(song)}>
                <span className="song-title">{song.title}</span>
                <span className="song-credit">{song.credit}</span>
              </button>
            </li>
          ))}
          <li className="search-suggest">
            <button type="button" onClick={openSuggest}>
              <span>{results.length ? 'آهنگت توی لیست نیست؟' : 'چیزی پیدا نشد!'}</span>
              <span className="search-suggest-cta">پیشنهادش بده ←</span>
            </button>
          </li>
        </ul>
      )}
      {suggesting !== null && <SongSuggestDialog initialTitle={suggesting} onClose={() => setSuggesting(null)} />}
    </div>
  )
}

export default SearchBox
