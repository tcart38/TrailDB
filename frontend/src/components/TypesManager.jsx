import { useState, useEffect, useRef } from 'react'
import { TAG_PRESETS, getTagStyle } from '../utils/constants.js'

const TYPE_PALETTE = ['tag-xc','tag-enduro','tag-dh','tag-flow','tag-tech','tag-jumps','tag-alt1','tag-alt2']
const HASH_TEXT_COLORS = {
  'tag-xc':     '#0f766e', 'tag-enduro': '#9a3412', 'tag-dh':   '#991b1b',
  'tag-flow':   '#15803d', 'tag-tech':   '#6d28d9', 'tag-jumps':'#92400e',
  'tag-alt1':   '#1e40af', 'tag-alt2':   '#9d174d',
}
function dotColor(typeName, colors) {
  const colorKey = colors[typeName]
  const style = getTagStyle(colorKey)
  if (style) return style.color
  let h = 0; for (let i = 0; i < typeName.length; i++) h = (h * 31 + typeName.charCodeAt(i)) >>> 0
  return HASH_TEXT_COLORS[TYPE_PALETTE[h % TYPE_PALETTE.length]] || '#888'
}

function ColorPicker({ type, current, onSelect, onClose, anchorRef }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (anchorRef?.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.left })
    }
  }, [anchorRef])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const isCustom = current?.startsWith('#')

  return (
    <div className="type-color-picker" ref={ref} style={{ position: 'fixed', top: pos.top, left: pos.left }}>
      <div className="type-color-presets">
        {TAG_PRESETS.map(preset => (
          <button
            key={preset.id}
            className={`type-color-swatch${current === preset.id ? ' selected' : ''}`}
            style={{ background: preset.swatch }}
            title={preset.label}
            onClick={() => { onSelect(type, preset.id); onClose() }}
          />
        ))}
      </div>
      <div className="type-color-custom">
        <span className="type-color-custom-label">Custom</span>
        <input
          type="color"
          className="type-color-input"
          defaultValue={isCustom ? current : '#6366f1'}
          onChange={e => onSelect(type, e.target.value)}
        />
      </div>
    </div>
  )
}

export default function TypesManager({ types, colors = {}, onAdd, onDelete, onUpdateColor }) {
  const [adding, setAdding]         = useState(false)
  const [newType, setNewType]       = useState('')
  const [confirming, setConfirming] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(null)
  const [addError, setAddError]     = useState('')
  const colorBtnRefs = useRef({})

  const handleAdd = () => {
    const t = newType.trim()
    if (!t) return
    if (types.map(x => x.toLowerCase()).includes(t.toLowerCase())) {
      setAddError('Already exists'); return
    }
    onAdd(t)
    setNewType(''); setAdding(false); setAddError('')
  }

  const cancelAdd = () => { setAdding(false); setNewType(''); setAddError('') }

  return (
    <div className="types-manager">
      <div className="types-manager-header">
        <span className="types-manager-label">Trail Types</span>
        <span className="types-manager-hint">Tags you can assign to locations</span>
      </div>

      <div className="types-chips">
        {types.map(type => {
          const colorKey = colors[type]
          const style = getTagStyle(colorKey)
          const dot = dotColor(type, colors)

          if (confirming === type) {
            return (
              <div key={type} className="type-chip type-chip-confirm">
                <span>Delete <strong>{type}</strong>?</span>
                <button className="type-confirm-yes"
                  onClick={() => { onDelete(type); setConfirming(null) }}>Delete</button>
                <button className="type-confirm-no"
                  onClick={() => setConfirming(null)}>Cancel</button>
              </div>
            )
          }

          return (
            <div key={type} className="type-chip">
              <button
                ref={el => colorBtnRefs.current[type] = el}
                className="type-chip-color"
                style={{ background: dot }}
                title="Change color"
                onClick={() => setPickerOpen(pickerOpen === type ? null : type)}
              />
              <span className="type-chip-label">{type}</span>
              <button className="type-chip-delete"
                onClick={() => setConfirming(type)}
                title={`Remove ${type}`}>×</button>
              {pickerOpen === type && (
                <ColorPicker
                  type={type}
                  current={colorKey}
                  onSelect={onUpdateColor}
                  onClose={() => setPickerOpen(null)}
                  anchorRef={{ current: colorBtnRefs.current[type] }}
                />
              )}
            </div>
          )
        })}

        {adding ? (
          <div className="type-add-row">
            <input
              autoFocus
              className={`type-add-input${addError ? ' input-error' : ''}`}
              placeholder="Type name…"
              value={newType}
              onChange={e => { setNewType(e.target.value); setAddError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') cancelAdd() }}
            />
            {addError && <span className="type-add-error">{addError}</span>}
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add</button>
            <button className="btn btn-secondary btn-sm" onClick={cancelAdd}>Cancel</button>
          </div>
        ) : (
          <button className="type-add-btn" onClick={() => setAdding(true)}>+ Add Type</button>
        )}
      </div>
    </div>
  )
}
