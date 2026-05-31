import { useState, useEffect, useRef } from 'react'

export default function ColumnPicker({ columns, hidden, onToggle, onReset, onReorder }) {
  const [open, setOpen]       = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const onDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (idx !== dragIdx) setOverIdx(idx)
  }
  const onDrop = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return }
    const keys = columns.map(c => c.key)
    keys.splice(idx, 0, keys.splice(dragIdx, 1)[0])
    onReorder(keys)
    setDragIdx(null)
    setOverIdx(null)
  }
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  const hiddenCount = hidden.size

  return (
    <div className="col-picker" ref={ref}>
      <button
        className={`btn btn-secondary col-picker-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        Columns
        <span className={`col-picker-count${hiddenCount === 0 ? ' col-picker-count--hidden' : ''}`}>
          {hiddenCount || ''}
        </span>
      </button>

      {open && (
        <div className="col-picker-menu">
          <div className="col-picker-header">
            <span>Show / hide &amp; reorder</span>
            {hiddenCount > 0 && (
              <button className="col-picker-reset" onClick={() => { onReset(); setOpen(false) }}>
                Show all
              </button>
            )}
          </div>

          {columns.map((col, idx) => (
            <div
              key={col.key}
              className={[
                'col-picker-item',
                dragIdx === idx ? 'cp-dragging' : '',
                overIdx === idx ? 'cp-over' : '',
              ].filter(Boolean).join(' ')}
              draggable
              onDragStart={e => onDragStart(e, idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={e => onDrop(e, idx)}
              onDragEnd={onDragEnd}
            >
              <span className="col-picker-handle" title="Drag to reorder">⠿</span>
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
          ))}
        </div>
      )}
    </div>
  )
}
