import { useEffect, useState } from "react"

/**
 * Trails a fast-changing value by `delay`.
 *
 * Used so a search request follows a pause in typing rather than every
 * keystroke: the backend candidate lookup is a real query, not a prefix cache.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
