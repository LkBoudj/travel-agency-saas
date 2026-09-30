import { useMemo, useState } from "react";

import { DEFAULT_ISLAND_MAX_RESULTS, filterIslandItems } from "../sdk.ts";
import type { SearchFilterProps } from "../sdk.ts";
import "./islands.css";

/**
 * Client-side search over items a theme already rendered as data. The island
 * owns only the query state; matching lives in the tested core helper.
 */
export default function SearchFilter(props: SearchFilterProps) {
  const {
    label,
    placeholder = "Search",
    emptyMessage = "No matches",
    items,
    initialQuery = "",
    maxResults = DEFAULT_ISLAND_MAX_RESULTS,
    id = "island-search-filter",
  } = props;

  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<string | null>(null);

  const results = useMemo(
    () => filterIslandItems(items, query, maxResults),
    [items, query, maxResults],
  );
  const selectedItem = items.find((item) => item.id === selected) ?? null;

  return (
    <div className="island-search" data-island="search-filter">
      <label className="island-field" htmlFor={id}>
        <span className="island-label">{label}</span>
        <input
          id={id}
          className="island-input"
          type="search"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
        />
      </label>

      <p className="island-count" id={`${id}-count`} role="status">
        {results.length} of {items.length}
      </p>

      {results.length === 0 ? (
        <p className="island-empty">{emptyMessage}</p>
      ) : (
        <ul className="island-list" aria-labelledby={`${id}-count`}>
          {results.map((item) => (
            <li key={item.id} className="island-list-item">
              {item.href ? (
                <a className="island-link" href={item.href}>
                  {item.label}
                </a>
              ) : (
                <button
                  type="button"
                  className="island-link"
                  aria-pressed={selected === item.id}
                  onClick={() => setSelected(item.id)}
                >
                  {item.label}
                </button>
              )}
              {item.meta ? <span className="island-list-meta">{item.meta}</span> : null}
            </li>
          ))}
        </ul>
      )}

      <p className="island-status" aria-live="polite">
        {selectedItem ? `Selected: ${selectedItem.label}` : ""}
      </p>
    </div>
  );
}
