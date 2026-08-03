import { useState } from 'react'
import type { FormEvent } from 'react'

type LocationSearchProps = {
  onSearch: (query: string) => void
  onLocate: () => void
  busy?: boolean
}

export function LocationSearch({ onSearch, onLocate, busy }: LocationSearchProps) {
  const [query, setQuery] = useState('Berlin')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSearch(query)
  }

  return (
    <div className="cta-row">
      <button type="button" className="btn btn-primary" onClick={onLocate} disabled={busy}>
        Wetter an meinem Ort
      </button>
      <form className="search-box" onSubmit={handleSubmit}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Stadt oder Ort suchen"
          aria-label="Ort suchen"
          disabled={busy}
        />
        <button type="submit" className="btn btn-ghost" disabled={busy}>
          Suchen
        </button>
      </form>
    </div>
  )
}
