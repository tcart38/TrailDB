import { useState, useEffect, useRef, useCallback } from 'react'
import { getLocations, updateLocation } from '../api/locations.js'
import { bulkDeleteLocations } from '../api/locations.js'
import { DIFFICULTIES, CONDITIONS, COUNTRIES, US_STATES, CA_PROVINCES } from '../utils/constants.js'
import { formatDriveTime } from '../utils/columns.js'

const SORTABLE_KEYS = new Set([
  'name','difficulty','distance_miles','elevation_gain_ft','drive_time_minutes','personal_rating','conditions','created_at'
])

const DIFF_COLOR = { Green: '#3fb950', Blue: '#58a6ff', Black: '#c9d1d9', 'Double Black': '#ff7b72' }
const COND_COLOR = { Perfect: '#3fb950', Good: '#7ee787', Wet: '#58a6ff', Closed: '#f85149' }

function getValue(col, row) {
  return col.builtin ? row[col.key] : (row.custom?.[col.key] ?? null)
}

function renderRawCell(col, row) {
  const v = getValue(col, row)
  const empty = v == null || v === '' || (Array.isArray(v) && v.length === 0)

  switch (col.type) {
    case 'tags':
      return empty ? <span className="raw-empty">—</span> : v.join(', ')
    case 'difficulty':
      return empty ? <span className="raw-empty">—</span>
        : <span style={{ color: DIFF_COLOR[v] || 'inherit' }}>{v}</span>
    case 'conditions':
      return empty ? <span className="raw-empty">—</span>
        : <span style={{ color: COND_COLOR[v] || 'inherit' }}>{v}</span>
    case 'seasons':
      return empty ? <span className="raw-empty">—</span> : v.map(s => s.slice(0,3)).join(', ')
    case 'rating':
      return empty ? <span className="raw-empty">—</span>
        : <span style={{ color: '#f0b429' }}>{v} / 5</span>
    case 'number':
      if (col.key === 'drive_time_minutes') {
        const fmt = formatDriveTime(v)
        return fmt ? fmt : <span className="raw-empty">—</span>
      }
      return empty ? <span className="raw-empty">—</span>
        : (typeof v === 'number' ? v.toLocaleString() : v)
    case 'url':
      return empty ? <span className="raw-empty">—</span>
        : (() => { try { return (
            <a href={v} target="_blank" rel="noopener noreferrer" className="raw-link"
               onClick={e => e.stopPropagation()}>
              {new URL(v).hostname.replace('www.','')}
            </a>
          )} catch { return <a href={v} target="_blank" rel="noopener noreferrer" className="raw-link"
               onClick={e => e.stopPropagation()}>link</a> } })()
    case 'boolean':
      return v == null ? <span className="raw-empty">—</span> : (v ? '✓' : '✗')
    case 'textarea':
      return empty ? <span className="raw-empty">—</span>
        : <span title={v}>{v.length > 55 ? v.slice(0,55)+'…' : v}</span>
    case 'text_autocomplete':
      return empty ? <span className="raw-empty">—</span> : String(v)
    default:
      return empty ? <span className="raw-empty">—</span> : String(v)
  }
}

export default function RawDataView({
  selectedId, onRowClick, refreshKey, onBulkDelete,
  columns,
}) {
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [sort, setSort]         = useState({ col: 'name', dir: 'asc' })

  // Multi-select state
  const [checkedIds, setCheckedIds]         = useState(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting]             = useState(false)
  const selectAllRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getLocations({ sort: sort.col, order: sort.dir })
      .then(setRows)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [sort, refreshKey])

  // Clear selection whenever the list refreshes
  useEffect(() => {
    setCheckedIds(new Set())
    setConfirmingDelete(false)
  }, [refreshKey])

  // Keep the header checkbox indeterminate state in sync
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = checkedIds.size > 0 && checkedIds.size < rows.length
    }
  }, [checkedIds, rows])

  const toggleOne = (e, id) => {
    e.stopPropagation()
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setCheckedIds(checkedIds.size === rows.length ? new Set() : new Set(rows.map(r => r.id)))
  }

  const handleBulkDelete = async () => {
    try {
      setDeleting(true)
      await bulkDeleteLocations([...checkedIds])
      setCheckedIds(new Set())
      setConfirmingDelete(false)
      onBulkDelete?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleSort = (key) =>
    setSort(prev => prev.col === key ? { col: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col: key, dir: 'asc' })

  // ── Inline cell editing ────────────────────────────────────────────────
  const [editingCell, setEditingCell] = useState(null)   // { rowId, colKey }
  const [editValue, setEditValue]     = useState('')

  const INLINE_SKIP = new Set(['tags','seasons'])   // multi-select — skip inline

  const startEdit = useCallback((e, rowId, colKey, currentVal) => {
    e.stopPropagation()
    setEditingCell({ rowId, colKey })
    setEditValue(currentVal == null ? '' : String(currentVal))
  }, [])

  const commitEdit = useCallback(async (rowId, colKey, overrideValue) => {
    const row = rows.find(r => r.id === rowId)
    if (!row) { setEditingCell(null); return }
    const col  = columns.find(c => c.key === colKey)
    const raw  = overrideValue !== undefined ? overrideValue : editValue

    let coerced = raw
    if (col?.type === 'number') coerced = raw !== '' ? Number(raw) : null
    else if (col?.type === 'boolean') coerced = Boolean(raw)
    else if (raw === '') coerced = null

    try {
      const payload = col?.builtin
        ? { ...row, [colKey]: coerced, trail_types: row.trail_types, best_seasons: row.best_seasons }
        : { ...row, trail_types: row.trail_types, best_seasons: row.best_seasons, custom: { ...row.custom, [colKey]: coerced } }
      await updateLocation(rowId, payload)
      setRows(prev => prev.map(r => {
        if (r.id !== rowId) return r
        if (col?.builtin) return { ...r, [colKey]: coerced }
        return { ...r, custom: { ...r.custom, [colKey]: coerced } }
      }))
    } catch (err) {
      setError(err.message)
    }
    setEditingCell(null)
  }, [rows, columns, editValue])

  const cancelEdit = () => setEditingCell(null)

  const enabledCols = columns.filter(c => c.enabled)

  const n = checkedIds.size

  return (
    <div className="raw-view">
      {error && <div className="error-banner">{error}</div>}

      <div className="raw-table-wrap">
        <table className="raw-table">
          <thead>
            <tr>
              <th className="raw-th raw-cb-th">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="raw-cb"
                  checked={rows.length > 0 && checkedIds.size === rows.length}
                  onChange={toggleAll}
                  title="Select all"
                />
              </th>
              <th className="raw-th raw-th-num">#</th>
              <th className="raw-th sortable" onClick={() => handleSort('name')}>
                Name
                <span className="raw-sort">{sort.col === 'name' ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
              </th>
              {enabledCols.map(col => {
                const sortable = SORTABLE_KEYS.has(col.key)
                const isSorted = sort.col === col.key
                return (
                  <th key={col.key}
                    className={`raw-th${col.type === 'number' || col.type === 'rating' ? ' raw-th-num' : ''}${sortable ? ' sortable' : ''}${isSorted ? ' sorted' : ''}`}
                    onClick={() => sortable && handleSort(col.key)}
                  >
                    {col.label}
                    {sortable && <span className="raw-sort">{isSorted ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={enabledCols.length + 3} className="raw-state">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={enabledCols.length + 3} className="raw-state">No locations yet.</td></tr>
            ) : rows.map((row, i) => {
              const isChecked = checkedIds.has(row.id)
              return (
                <tr key={row.id}
                  className={`raw-row${selectedId === row.id ? ' selected' : ''}${isChecked ? ' row-checked' : ''}`}
                >
                  <td className="raw-td raw-cb-td" onClick={e => toggleOne(e, row.id)}>
                    <input type="checkbox" className="raw-cb" checked={isChecked} onChange={() => {}} />
                  </td>
                  <td className="raw-td raw-td-num raw-td-idx">{i + 1}</td>
                  {/* Name cell — click opens detail panel */}
                  <td className="raw-td raw-td-name raw-td-clickable" onClick={() => onRowClick(row)}>
                    {row.name}
                    <span className="raw-open-icon" title="Open detail">↗</span>
                  </td>
                  {enabledCols.map(col => {
                    const isEditing = editingCell?.rowId === col.key && false // placeholder
                    const active    = editingCell?.rowId === row.id && editingCell?.colKey === col.key
                    const canEdit   = !INLINE_SKIP.has(col.type)
                    const v         = getValue(col, row)

                    if (active) {
                      // Inline editor
                      const inputClass = 'raw-inline-input'
                      const onKeyDown = (e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(row.id, col.key) }
                        if (e.key === 'Escape') cancelEdit()
                        e.stopPropagation()
                      }
                      if (col.type === 'difficulty') {
                        return (
                          <td key={col.key} className="raw-td raw-td-editing">
                            <select className={inputClass} autoFocus value={editValue}
                              onChange={e => commitEdit(row.id, col.key, e.target.value || null)}
                              onBlur={() => commitEdit(row.id, col.key)}
                              onKeyDown={onKeyDown}>
                              <option value="">—</option>
                              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </td>
                        )
                      }
                      if (col.type === 'conditions') {
                        return (
                          <td key={col.key} className="raw-td raw-td-editing">
                            <select className={inputClass} autoFocus value={editValue}
                              onChange={e => commitEdit(row.id, col.key, e.target.value || null)}
                              onBlur={() => commitEdit(row.id, col.key)}
                              onKeyDown={onKeyDown}>
                              <option value="">—</option>
                              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        )
                      }
                      if (col.type === 'country') {
                        return (
                          <td key={col.key} className="raw-td raw-td-editing">
                            <select className={inputClass} autoFocus value={editValue}
                              onChange={e => commitEdit(row.id, col.key, e.target.value || null)}
                              onBlur={() => commitEdit(row.id, col.key)}
                              onKeyDown={onKeyDown}>
                              <option value="">—</option>
                              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                        )
                      }
                      if (col.type === 'state_province') {
                        const stateOpts = row.country === 'Canada' ? CA_PROVINCES : US_STATES
                        const stateLabel = row.country === 'Canada' ? 'province' : 'state'
                        return (
                          <td key={col.key} className="raw-td raw-td-editing">
                            <select className={inputClass} autoFocus value={editValue}
                              onChange={e => commitEdit(row.id, col.key, e.target.value || null)}
                              onBlur={() => commitEdit(row.id, col.key)}
                              onKeyDown={onKeyDown}>
                              <option value="">— {stateLabel} —</option>
                              {stateOpts.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        )
                      }
                      if (col.type === 'boolean') {
                        return (
                          <td key={col.key} className="raw-td raw-td-editing">
                            <select className={inputClass} autoFocus value={editValue}
                              onChange={e => commitEdit(row.id, col.key, e.target.value === 'true')}
                              onBlur={() => commitEdit(row.id, col.key)}>
                              <option value="">—</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </td>
                        )
                      }
                      const inputType = col.type === 'number' || col.type === 'rating' ? 'number' : col.type === 'url' ? 'url' : 'text'
                      return (
                        <td key={col.key} className="raw-td raw-td-editing">
                          <input className={inputClass} autoFocus type={inputType}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(row.id, col.key)}
                            onKeyDown={onKeyDown}
                          />
                        </td>
                      )
                    }

                    // Normal display cell — click to edit
                    return (
                      <td key={col.key}
                        className={[
                          'raw-td',
                          col.type === 'number' || col.type === 'rating' ? 'raw-td-num' : '',
                          col.type === 'textarea' ? 'raw-td-notes' : '',
                          canEdit ? 'raw-td-editable' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={canEdit ? (e) => startEdit(e, row.id, col.key, v) : undefined}
                        title={canEdit ? 'Click to edit' : undefined}
                      >
                        {renderRawCell(col, row)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {n > 0 && (
        <div className={`raw-action-bar${confirmingDelete ? ' raw-action-bar-warn' : ''}`}>
          {confirmingDelete ? (
            <>
              <span className="raw-action-msg">
                ⚠ Permanently delete {n} location{n !== 1 ? 's' : ''}? This cannot be undone.
              </span>
              <div className="raw-action-btns">
                <button className="btn btn-secondary" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleBulkDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : `Yes, delete ${n}`}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="raw-action-msg">
                {n} row{n !== 1 ? 's' : ''} selected
              </span>
              <div className="raw-action-btns">
                <button className="btn btn-ghost" onClick={() => setCheckedIds(new Set())}>
                  Clear
                </button>
                <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
                  Delete {n} row{n !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
