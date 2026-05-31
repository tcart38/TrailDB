import { useState } from 'react'
import { createTrail, updateTrail, deleteTrail } from '../api/trails.js'
import { DIFFICULTIES } from '../utils/constants.js'

const DIFF_COLOR = { Green: '#3fb950', Blue: '#58a6ff', Black: '#c9d1d9', 'Double Black': '#ff7b72' }
const KNOWN_CHIP_CLASS = { XC: 'chip-xc', Enduro: 'chip-enduro', DH: 'chip-dh', Flow: 'chip-flow', Tech: 'chip-tech' }

const emptyTrail = () => ({
  name: '', difficulty: '', distance_miles: '', elevation_gain_ft: '', tags: [], description: '', trailforks_url: '',
})

function TrailForm({ initial = emptyTrail(), onSave, onCancel, trailTypes = [] }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleTag = (t) => set('tags', form.tags.includes(t) ? form.tags.filter(x => x !== t) : [...form.tags, t])

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('Name is required'); return }
    setSaving(true)
    setErr('')
    try {
      await onSave(form)
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="trail-form">
      <div className="trail-form-row">
        <input className="form-input trail-form-name" placeholder="Trail name *"
          value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
        <select className="form-select trail-form-diff" value={form.difficulty}
          onChange={e => set('difficulty', e.target.value)}>
          <option value="">Difficulty…</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input className="form-input trail-form-num" type="number" placeholder="mi" step="0.1" min="0"
          value={form.distance_miles} onChange={e => set('distance_miles', e.target.value)} />
        <input className="form-input trail-form-num" type="number" placeholder="ft elev"  min="0"
          value={form.elevation_gain_ft} onChange={e => set('elevation_gain_ft', e.target.value)} />
      </div>
      <div className="chip-group" style={{ marginTop: 6 }}>
        {trailTypes.map(t => (
          <button key={t} type="button"
            className={`toggle-chip ${KNOWN_CHIP_CLASS[t] ?? ''} ${form.tags.includes(t) ? 'active' : ''}`}
            onClick={() => toggleTag(t)}>
            {t}
          </button>
        ))}
      </div>
      <input className="form-input" style={{ marginTop: 6 }} placeholder="Trailforks or trail URL (optional)"
        value={form.trailforks_url} onChange={e => set('trailforks_url', e.target.value)} />
      <textarea className="form-textarea" style={{ marginTop: 6 }} rows={2} placeholder="Description (optional)"
        value={form.description} onChange={e => set('description', e.target.value)} />
      {err && <div className="form-error" style={{ marginTop: 4 }}>{err}</div>}
      <div className="trail-form-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Trail'}
        </button>
      </div>
    </div>
  )
}

function TrailRow({ trail, trailTypes, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    setDeleting(true)
    await deleteTrail(trail.id)
    onRefresh()
  }

  if (editing) {
    return (
      <TrailForm
        initial={{
          name: trail.name, difficulty: trail.difficulty || '', distance_miles: trail.distance_miles ?? '',
          elevation_gain_ft: trail.elevation_gain_ft ?? '', tags: trail.tags || [],
          description: trail.description || '', trailforks_url: trail.trailforks_url || '',
        }}
        trailTypes={trailTypes}
        onSave={async (data) => { await updateTrail(trail.id, data); setEditing(false); onRefresh() }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  if (confirming) {
    return (
      <div className="trail-row trail-row-confirm">
        <span>Delete <strong>{trail.name}</strong>?</span>
        <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? '…' : 'Delete'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
      </div>
    )
  }

  return (
    <div className="trail-row">
      <div className="trail-row-info">
        <span className="trail-row-name">
          {trail.trailforks_url
            ? <a href={trail.trailforks_url} target="_blank" rel="noopener noreferrer"
                 className="trail-name-link" onClick={e => e.stopPropagation()}>{trail.name}</a>
            : trail.name}
        </span>
        <div className="trail-row-meta">
          {trail.difficulty && (
            <span className="trail-diff" style={{ color: DIFF_COLOR[trail.difficulty] }}>
              {trail.difficulty}
            </span>
          )}
          {trail.distance_miles != null && <span>{trail.distance_miles} mi</span>}
          {trail.elevation_gain_ft != null && <span>{trail.elevation_gain_ft.toLocaleString()} ft</span>}
          {trail.tags.map(t => (
            <span key={t} className={`tag ${KNOWN_CHIP_CLASS[t] ?? ''}`}>{t}</span>
          ))}
        </div>
        {trail.description && <p className="trail-row-desc">{trail.description}</p>}
      </div>
      <div className="trail-row-actions">
        <button className="btn-ghost trail-action-btn" onClick={() => setEditing(true)} title="Edit" aria-label="Edit trail">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2l2 2-7 7H3v-2l7-7z"/></svg>
        </button>
        <button className="btn-ghost trail-action-btn" onClick={() => setConfirming(true)} title="Delete" aria-label="Delete trail">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="3,4 11,4"/><path d="M5 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"/><path d="M4 4l.75 7.5a1 1 0 0 0 1 .9h4.5a1 1 0 0 0 1-.9L12 4"/></svg>
        </button>
      </div>
    </div>
  )
}

export default function TrailList({ locationId, trails, trailTypes, onRefresh }) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="trail-list">
      <div className="trail-list-header">
        <span className="trail-list-title">TRAILS</span>
        <span className="trail-list-count">{trails.length}</span>
        <button className="trail-add-btn" onClick={() => setAdding(true)}>+ Add Trail</button>
      </div>

      {adding && (
        <TrailForm
          trailTypes={trailTypes}
          onSave={async (data) => { await createTrail(locationId, data); setAdding(false); onRefresh() }}
          onCancel={() => setAdding(false)}
        />
      )}

      {trails.length === 0 && !adding && (
        <p className="trail-empty">No trails added yet.</p>
      )}

      {trails.map(t => (
        <TrailRow key={t.id} trail={t} trailTypes={trailTypes} onRefresh={onRefresh} />
      ))}
    </div>
  )
}
