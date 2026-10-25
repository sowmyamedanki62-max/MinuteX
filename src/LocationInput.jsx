import { useEffect, useRef, useState } from 'react'

function LocationInput({
  id,
  value,
  onChange,
  placeholder,
  required = false,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const query = value.trim()

    if (query.length < 3 || !open) {
      setSuggestions([])
      setLoading(false)
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      try {
        setLoading(true)

        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
        )

        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()

        if (!cancelled) {
          setSuggestions(
            (data.features || []).map((feature, index) => {
              const p = feature.properties || {}

              const parts = [
                p.name,
                p.street && p.housenumber
                  ? `${p.street} ${p.housenumber}`
                  : p.street,
                p.city || p.district || p.county,
                p.state,
                p.country,
              ].filter(Boolean)

              return {
                id: `${p.osm_id || p.name || 'place'}-${index}`,
                label: [...new Set(parts)].join(', '),
              }
            })
          )
        }
      } catch {
        if (!cancelled) setSuggestions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 450)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value, open])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }
  }, [])

  return (
    <div className="location-input-wrapper" ref={wrapperRef}>
      <span className="location-search-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.2 4.2" />
        </svg>
      </span>

      <input
        className="location-search-input"
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
      />

      {value && (
        <button
          className="location-clear-button"
          type="button"
          aria-label="Clear location"
          onClick={() => {
            onChange('')
            setOpen(true)
            setSuggestions([])
          }}
        >
          ×
        </button>
      )}

      {open && value.trim().length >= 3 && (
        <div className="location-suggestions">
          {loading ? (
            <div className="location-message">
              <span className="location-spinner" />
              Searching locations...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="location-message">
              No suggestions found. Check your connection or
              try another search.
            </div>
          ) : (
            <>
              <div className="suggestions-heading">
                SUGGESTED LOCATIONS
              </div>

              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className="location-suggestion"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(suggestion.label)
                    setOpen(false)
                    setSuggestions([])
                  }}
                >
                  <span className="suggestion-pin">⌖</span>
                  <span className="suggestion-label">
                    {suggestion.label}
                  </span>
                  <span className="suggestion-arrow">↗</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default LocationInput
