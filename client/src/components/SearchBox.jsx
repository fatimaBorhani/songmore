import { useEffect, useRef, useState } from 'react'
import { searchSongs } from '../api.js'

// جستجو با تاخیر کوتاه (debounce) تا هر حرف مستقیم به سرور نره
function SearchBox({ disabled, onChoose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    timerRef.current = setTimeout(async () => {
      const found = await searchSongs(query)
      setResults(found)
    }, 250)
    return () => clearTimeout(timerRef.current)
  }, [query])

  function choose(song) {
    onChoose(song)
    setQuery('')
    setResults([])
  }

  return (
    <div className="search-box">
      <input
        type="text"
        placeholder="اسم آهنگ یا خواننده..."
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((song) => (
            <li key={song.id}>
              <button type="button" onClick={() => choose(song)}>
                <span className="song-title">{song.title}</span>
                <span className="song-credit">{song.credit}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SearchBox
