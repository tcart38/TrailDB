import { useState } from 'react'
import { FIELD_TYPES } from '../utils/columns.js'

export default function ColumnsManager({ columns, onToggle, onAdd, onDelete }) {
  const [confirming, setConfirming] = useState(null) // { key, action: 'disable'|'delete' }
  const [adding, setAdding]         = useState(false)
  const [newLabel, setNewLabel]     = useState('')
  const [newType, setNewType]       = useState('text')
  const [addError, setAddError]     = useState('')

  const handleChipClick = (col) => {
    if (!col.enabled) { onToggle(col.key, true); return }
    setConfirming({ key: col.key, action: 'disable' })
  }

  const handleDeleteClick = (e, col) => {
    e.stopPropagation()
    setConfirming({ key: col.key, action: 'delete' })
  }

  const handleConfirm = () => {
    if (!confirming) return
    if (confirming.action === 'disable') onToggle(confirming.key, false)
    if (confirming.action === 'delete')  onDelete(confirming.key)
    setConfirming(null)
  }

  const handleAdd = () => {
    const label = newLabel.trim()
    if (!label) return
    if (columns.some(c => c.label.toLowerCase() === label.toLowerCase())) {
      setAddError('Already exists'); return
    }
    onAdd(label, newType)
    setNewLabel(''); setNewType('text'); setAdding(false); setAddError('')
  }

  const cancelAdd = () => { setAdding(false); setNewLabel(''); setAddError('') }

  return (
    <div className="cols-manager">
      <div className="cols-manager-header">
        <span className="cols-manager-label">Columns</span>
        <span className="cols-manager-hint">Manage the data tracked for each location</span>
      </div>

      <div className="cols-chips">
        {columns.map(col => {
          const isConfirming = confirming?.key === col.key

          if (isConfirming) {
            const isDelete = confirming.action === 'delete'
            const msg = isDelete
              ? col.builtin
                ? `Remove "${col.label}" from the app? Data stays in the database.`
                : `Delete "${col.label}" and all its data permanently?`
              : `Hide "${col.label}" everywhere?`

            return (
              <div key={col.key} className="col-chip col-chip-confirm">
                <span>{msg}</span>
                <button className="col-confirm-yes" onClick={handleConfirm}>
                  {isDelete ? 'Remove' : 'Hide'}
                </button>
                <button className="col-confirm-no" onClick={() => setConfirming(null)}>Cancel</button>
              </div>
            )
          }

          return (
            <div
              key={col.key}
              className={`col-chip${col.enabled ? '' : ' col-chip-off'}`}
              onClick={() => handleChipClick(col)}
              title={col.enabled ? 'Click to hide' : 'Click to show'}
            >
              <span className="col-chip-label">{col.label}</span>
              <button
                className="col-chip-delete"
                onClick={e => handleDeleteClick(e, col)}
                title={col.builtin ? 'Remove column from app' : 'Delete column and all data'}
              >×</button>
            </div>
          )
        })}

        {adding ? (
          <div className="col-add-row">
            <input
              autoFocus
              className={`col-add-input${addError ? ' input-error' : ''}`}
              placeholder="Column name…"
              value={newLabel}
              onChange={e => { setNewLabel(e.target.value); setAddError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') cancelAdd() }}
            />
            <select className="col-add-type" value={newType} onChange={e => setNewType(e.target.value)}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {addError && <span className="col-add-error">{addError}</span>}
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add</button>
            <button className="btn btn-secondary btn-sm" onClick={cancelAdd}>Cancel</button>
          </div>
        ) : (
          <button className="col-add-btn" onClick={() => setAdding(true)}>+ Add Column</button>
        )}
      </div>
    </div>
  )
}
