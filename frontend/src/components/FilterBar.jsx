import { useState, useEffect, useRef } from 'react'
import { DIFFICULTIES, SEASONS, CONDITIONS } from '../utils/constants.js'
import { getFilterType, formatDriveTime } from '../utils/columns.js'
import ColumnPicker from './ColumnPicker.jsx'
import FilterPicker from './FilterPicker.jsx'

const Chevron = () => (
  <svg width="9" height="5" viewBox="0 0 9 5" fill="currentColor" style={{ opacity: 0.45, flexShrink: 0 }}>
    <path d="M0 0l4.5 5L9 0z" />
  </svg>
)

function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return { open, setOpen, ref }
}

function RangeFilterButton({ col, filters, onSet, onClear, bounds = {} }) {
  const { open, setOpen, ref } = usePopover()

  const lo = bounds.min ?? 0
  const hi = bounds.max ?? 100
  const range = hi - lo || 1

  const filterMin = filters[col.key + '_min'] ?? ''
  const filterMax = filters[col.key + '_max'] ?? ''

  // Draft state drives the slider visually during drag.
  // Filter state (filterMin/filterMax) only commits on mouse release.
  // This prevents React's controlled-value re-renders from fighting the browser drag.
  const [draftMin, setDraftMin] = useState(() => filterMin !== '' ? Number(filterMin) : lo)
  const [draftMax, setDraftMax] = useState(() => filterMax !== '' ? Number(filterMax) : hi)

  // Sync draft when filter changes externally (Clear button, number input, bounds change)
  useEffect(() => { setDraftMin(filterMin !== '' ? Number(filterMin) : lo) }, [filterMin, lo])
  useEffect(() => { setDraftMax(filterMax !== '' ? Number(filterMax) : hi) }, [filterMax, hi])

  const commitMin = (val) => {
    const n = Number(val)
    onSet(col.key + '_min', n <= lo ? '' : String(n))
  }
  const commitMax = (val) => {
    const n = Number(val)
    onSet(col.key + '_max', n >= hi ? '' : String(n))
  }

  const minPct = ((draftMin - lo) / range) * 100
  const maxPct = ((draftMax - lo) / range) * 100
  const minTrack = `linear-gradient(to right, var(--border) ${minPct}%, var(--accent) ${minPct}%)`
  const maxTrack = `linear-gradient(to right, var(--accent) ${maxPct}%, var(--border) ${maxPct}%)`

  const minActive = filterMin !== '' && Number(filterMin) > lo
  const maxActive = filterMax !== '' && Number(filterMax) < hi
  const active = minActive || maxActive

  // Number inputs show live draft values; empty string when at the no-filter boundary
  const minInputVal = draftMin > lo ? String(Math.round(draftMin)) : ''
  const maxInputVal = draftMax < hi ? String(Math.round(draftMax)) : ''

  // Button label uses committed filter values only (stable during drag)
  const fmt = (v) => col.key === 'drive_time_minutes' ? formatDriveTime(Number(v)) : v
  const rangeLabel = active
    ? [minActive && `≥${fmt(filterMin)}`, maxActive && `≤${fmt(filterMax)}`].filter(Boolean).join(' ')
    : null

  return (
    <div className="filter-pop" ref={ref}>
      <button
        className={`filter-pop-trigger${active ? ' active' : ''}${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span>{col.label}{rangeLabel ? `: ${rangeLabel}` : ''}</span>
        <Chevron />
      </button>

      {open && (
        <div className="filter-pop-menu filter-pop-menu--range">
          <div className="filter-pop-header">{col.label}</div>
          <div className="filter-pop-body">
            <div className="filter-pop-row">
              <label className="filter-pop-label">Min</label>
              <input
                type="range"
                className="filter-pop-slider"
                min={lo} max={hi}
                value={draftMin}
                style={{ background: minTrack }}
                onChange={e => setDraftMin(Number(e.target.value))}
                onMouseUp={e => commitMin(e.target.value)}
                onTouchEnd={e => commitMin(e.target.value)}
              />
              <input
                type="number"
                className="filter-pop-num"
                placeholder={String(lo)}
                value={minInputVal}
                onChange={e => {
                  const n = e.target.value !== '' ? Number(e.target.value) : lo
                  setDraftMin(n)
                  onSet(col.key + '_min', e.target.value)
                }}
              />
            </div>
            <div className="filter-pop-row">
              <label className="filter-pop-label">Max</label>
              <input
                type="range"
                className="filter-pop-slider"
                min={lo} max={hi}
                value={draftMax}
                style={{ background: maxTrack }}
                onChange={e => setDraftMax(Number(e.target.value))}
                onMouseUp={e => commitMax(e.target.value)}
                onTouchEnd={e => commitMax(e.target.value)}
              />
              <input
                type="number"
                className="filter-pop-num"
                placeholder={String(hi)}
                value={maxInputVal}
                onChange={e => {
                  const n = e.target.value !== '' ? Number(e.target.value) : hi
                  setDraftMax(n)
                  onSet(col.key + '_max', e.target.value)
                }}
              />
            </div>
          </div>
          {active && (
            <div className="filter-pop-footer">
              <button className="filter-pop-clear" onClick={() => { onClear(col.key); setOpen(false) }}>
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MultiSelectFilter({ col, options, filters, onSet }) {
  const { open, setOpen, ref } = usePopover()
  const selected = Array.isArray(filters[col.key]) ? filters[col.key] : []
  const count = selected.length

  const toggle = (val) => {
    const next = selected.includes(val)
      ? selected.filter(v => v !== val)
      : [...selected, val]
    onSet(col.key, next)
  }

  const label = count === 0
    ? col.label
    : count <= 2
      ? selected.join(', ')
      : `${selected.slice(0, 2).join(', ')} +${count - 2}`

  return (
    <div className="filter-pop" ref={ref}>
      <button
        className={`filter-pop-trigger${count ? ' active' : ''}${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span>{label}</span>
        <Chevron />
      </button>

      {open && (
        <div className="filter-pop-menu">
          <div className="filter-pop-header">
            {col.label}
            {count > 0 && (
              <button className="col-picker-reset" onClick={() => onSet(col.key, [])}>
                Clear
              </button>
            )}
          </div>
          {options.map(opt => (
            <div key={opt} className="col-picker-item" onClick={() => toggle(opt)}>
              <input
                type="checkbox"
                className="col-picker-cb"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                onClick={e => e.stopPropagation()}
              />
              <span className="col-picker-name">{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterViews({ filters, nameSearch, onFiltersChange, onNameSearch, numericBounds }) {
  const [open, setOpen]           = useState(false)
  const [views, setViews]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('filterViews') || '[]') }
    catch { return [] }
  })
  const [newName, setNewName]     = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setConfirmId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hasActive = nameSearch.trim() || Object.entries(filters).some(([k, v]) => {
    if (Array.isArray(v)) return v.length > 0
    if (v === '' || v == null) return false
    if (k.endsWith('_min')) { const b = numericBounds[k.slice(0, -4)]; if (b && Number(v) <= b.min) return false }
    if (k.endsWith('_max')) { const b = numericBounds[k.slice(0, -4)]; if (b && Number(v) >= b.max) return false }
    return true
  })

  const persist = (updated) => {
    setViews(updated)
    localStorage.setItem('filterViews', JSON.stringify(updated))
  }

  const save = () => {
    const name = newName.trim()
    if (!name) return
    persist([...views, { id: Date.now(), name, filters: { ...filters }, nameSearch }])
    setNewName('')
  }

  const remove = (id) => {
    persist(views.filter(v => v.id !== id))
    setConfirmId(null)
  }

  const apply = (view) => {
    onFiltersChange(view.filters || {})
    onNameSearch(view.nameSearch || '')
    setOpen(false)
  }

  return (
    <div className="col-picker" ref={ref}>
      <button
        className={`btn btn-secondary col-picker-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        Views
        <span className={`col-picker-count${views.length === 0 ? ' col-picker-count--hidden' : ''}`}>
          {views.length || ''}
        </span>
      </button>

      {open && (
        <div className="col-picker-menu fv-menu">
          <div className="col-picker-header">
            <span>Saved views</span>
          </div>

          {views.length === 0 && !hasActive && (
            <div className="fv-empty">Set some filters then save as a view</div>
          )}

          {views.map(view => (
            <div key={view.id} className="fv-item">
              {confirmId === view.id ? (
                <>
                  <span className="fv-confirm-text">Delete "{view.name}"?</span>
                  <button className="fv-confirm-yes" onClick={() => remove(view.id)}>Yes</button>
                  <button className="fv-confirm-no" onClick={() => setConfirmId(null)}>No</button>
                </>
              ) : (
                <>
                  <button className="fv-apply" onClick={() => apply(view)}>{view.name}</button>
                  <button className="fv-delete" onClick={() => setConfirmId(view.id)} title="Delete view">×</button>
                </>
              )}
            </div>
          ))}

          {hasActive && (
            <div className="fv-save">
              {views.length > 0 && <div className="fv-divider" />}
              <div className="fv-save-row">
                <input
                  type="text"
                  className="fv-input"
                  placeholder="Name this view…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') save() }}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm" onClick={save} disabled={!newName.trim()}>
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FilterBar({
  filters, nameSearch, onFiltersChange, onNameSearch,
  trailTypes = [], columns = [], countries = [],
  numericBounds = {},
  hiddenCols = new Set(), onToggleCol, onResetCols, onReorderCols,
  hiddenFilters = new Set(), onToggleFilter, onResetFilters,
  locationOptions = {},
}) {
  const set = (key, val) => onFiltersChange({ ...filters, [key]: val })
  const clearRange = (key) => {
    const updated = { ...filters }
    delete updated[key + '_min']
    delete updated[key + '_max']
    onFiltersChange(updated)
  }
  const clear = () => { onFiltersChange({}); onNameSearch('') }

  const hasActive = nameSearch.trim() || Object.entries(filters).some(([k, v]) => {
    if (Array.isArray(v)) return v.length > 0
    if (v === '' || v == null) return false
    if (k.endsWith('_min')) {
      const bound = numericBounds[k.slice(0, -4)]
      if (bound && Number(v) <= bound.min) return false
    }
    if (k.endsWith('_max')) {
      const bound = numericBounds[k.slice(0, -4)]
      if (bound && Number(v) >= bound.max) return false
    }
    return true
  })

  const regionOptions = filters.state && locationOptions.regions?.[filters.state]
    ? locationOptions.regions[filters.state]
    : Object.values(locationOptions.regions ?? {}).flat().filter((v, i, a) => a.indexOf(v) === i).sort()

  const renderFilter = (col) => {
    const ft = getFilterType(col)
    if (!ft) return null

    if (ft === 'range') {
      return (
        <RangeFilterButton
          key={col.key}
          col={col}
          filters={filters}
          onSet={set}
          onClear={clearRange}
          bounds={numericBounds[col.key]}
        />
      )
    }

    if (ft === 'tags') {
      if (!trailTypes.length) return null
      return (
        <MultiSelectFilter
          key={col.key}
          col={col}
          options={trailTypes}
          filters={filters}
          onSet={set}
        />
      )
    }

    const val = filters[col.key] ?? ''

    if (ft === 'state') {
      if (!(locationOptions.states ?? []).length) return null
      return (
        <select key={col.key} className={`filter-select${val ? ' active' : ''}`}
          value={val} onChange={e => set(col.key, e.target.value)}>
          <option value="">All states</option>
          {locationOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )
    }

    if (ft === 'region') {
      if (!regionOptions.length) return null
      return (
        <select key={col.key} className={`filter-select${val ? ' active' : ''}`}
          value={val} onChange={e => set(col.key, e.target.value)}>
          <option value="">All regions</option>
          {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      )
    }

    if (ft === 'country') {
      if (!countries.length) return null
      return (
        <select key={col.key} className={`filter-select${val ? ' active' : ''}`}
          value={val} onChange={e => set(col.key, e.target.value)}>
          <option value="">All countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )
    }

    if (ft === 'difficulty') {
      return (
        <select key={col.key} className={`filter-select${val ? ' active' : ''}`}
          value={val} onChange={e => set(col.key, e.target.value)}>
          <option value="">All difficulties</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      )
    }

    if (ft === 'seasons') {
      return (
        <select key={col.key} className={`filter-select${val ? ' active' : ''}`}
          value={val} onChange={e => set(col.key, e.target.value)}>
          <option value="">All seasons</option>
          {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )
    }

    if (ft === 'conditions') {
      return (
        <select key={col.key} className={`filter-select${val ? ' active' : ''}`}
          value={val} onChange={e => set(col.key, e.target.value)}>
          <option value="">All conditions</option>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )
    }

    if (ft === 'rating') {
      return (
        <select key={col.key} className={`filter-select${val ? ' active' : ''}`}
          value={val} onChange={e => set(col.key, e.target.value)}>
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map(r => (
            <option key={r} value={r}>
              {'★'.repeat(r)}{'☆'.repeat(5 - r)}{r < 5 ? ' & up' : ' only'}
            </option>
          ))}
        </select>
      )
    }

    if (ft === 'boolean') {
      return (
        <select key={col.key} className={`filter-select${val ? ' active' : ''}`}
          value={val} onChange={e => set(col.key, e.target.value)}>
          <option value="">Any {col.label}</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )
    }

    if (ft === 'text') {
      return (
        <input
          key={col.key}
          type="text"
          className={`filter-select${val ? ' active' : ''}`}
          style={{ minWidth: 100 }}
          placeholder={`${col.label}…`}
          value={val}
          onChange={e => set(col.key, e.target.value)}
        />
      )
    }

    return null
  }

  const visibleFilters = columns
    .filter(col => !hiddenFilters.has(col.key))
    .map(col => renderFilter(col))
    .filter(Boolean)

  return (
    <div className="filter-bar">

      {/* ── Top row: search + reset + action buttons (never wraps) ── */}
      <div className="filter-bar-top">
        <div className="filter-search-wrap">
          <svg className="filter-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="4.5" /><line x1="10" y1="10" x2="14" y2="14" />
          </svg>
          <input
            type="search"
            className="filter-search"
            placeholder="Search locations…"
            value={nameSearch}
            onChange={e => onNameSearch(e.target.value)}
            aria-label="Search locations"
          />
        </div>
        {hasActive && (
          <button className="btn btn-ghost" onClick={clear}>Reset filters</button>
        )}
        <div className="filter-bar-actions">
          <FilterViews
            filters={filters}
            nameSearch={nameSearch}
            onFiltersChange={onFiltersChange}
            onNameSearch={onNameSearch}
            numericBounds={numericBounds}
          />
          <FilterPicker
            columns={columns}
            hidden={hiddenFilters}
            onToggle={onToggleFilter}
            onReset={onResetFilters}
          />
          <ColumnPicker
            columns={columns}
            hidden={hiddenCols}
            onToggle={onToggleCol}
            onReset={onResetCols}
            onReorder={onReorderCols}
          />
        </div>
      </div>

      {/* ── Filter row: wraps freely, only shown when there are visible filters ── */}
      {visibleFilters.length > 0 && (
        <div className="filter-bar-filters">
          {visibleFilters}
        </div>
      )}

    </div>
  )
}
