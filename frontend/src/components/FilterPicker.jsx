import { useState, useEffect, useRef } from 'react'
import { getFilterType } from '../utils/columns.js'

export default function FilterPicker({ columns = [], hidden, onToggle, onReset }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filterable = columns.filter(c => getFilterType(c) !== null)
  const hiddenCount = filterable.filter(c => hidden.has(c.key)).length

  return (
    <div className="col-picker" ref={ref}>
      <button
        className={`btn btn-secondary col-picker-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        Filters
        <span className={`col-picker-count${hiddenCount === 0 ? ' col-picker-count--hidden' : ''}`}>
          {hiddenCount || ''}
        </span>
      </button>

      {open && (
        <div className="col-picker-menu">
          <div className="col-picker-header">
            <span>Show / hide filters</span>
            {hiddenCount > 0 && (
              <button className="col-picker-reset" onClick={() => { onReset(); setOpen(false) }}>
                Show all
              </button>
            )}
          </div>

          {filterable.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
              No filterable columns
            </div>
          ) : (
            filterable.map(col => (
              <div key={col.key} className="col-picker-item">
                <input
                  type="checkbox"
                  className="col-picker-cb"
                  checked={!hidden.has(col.key)}
                  onChange={() => onToggle(col.key)}
                  onClick={e => e.stopPropagation()}
                />
                <span className="col-picker-name" onClick={() => onToggle(col.key)}>
                  {col.label}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
