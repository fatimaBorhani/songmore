import { useEffect, useState } from 'react'
import { searchSongs } from '../api.js'

// جستجو با تاخیر کوتاه (debounce) تا هر حرف مستقیم به سرور نره
function SearchBox({ disabled, onChoose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!query.trim()) return

    let active = true
    const timer = setTimeout(async () => {
      const found = await searchSongs(query).catch(() => [])
      if (active) setResults(found)
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

  return (
    <div className="search-box">
      <input
        type="text"
        placeholder="اسم آهنگ یا خواننده..."
        value={query}
        disabled={disabled}
        onChange={changeQuery}
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
