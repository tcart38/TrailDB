import { SEASONS, DIFFICULTIES, CONDITIONS, COUNTRIES, US_STATES, CA_PROVINCES } from '../utils/constants.js'

const KNOWN_CHIP_CLASS = {
  XC: 'chip-xc', Enduro: 'chip-enduro', DH: 'chip-dh', Flow: 'chip-flow', Tech: 'chip-tech',
}

const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="6" width="8" height="6" rx="1.5"/>
    <path d="M5 6V4.5a2 2 0 0 1 4 0V6"/>
  </svg>
)

// ── Section header ────────────────────────────────────────────────────────
function FormSection({ title, children }) {
  return (
    <div className="form-section">
      <p className="form-section-title">{title}</p>
      {children}
    </div>
  )
}

// ── Individual field renderers ────────────────────────────────────────────
function BuiltinField({ col, form, set, toggle, trailTypes, locationOptions }) {
  switch (col.key) {
    case 'country':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-country">{col.label}</label>
          <select id="field-country" className="form-select" value={form.country || ''}
            onChange={e => set('country', e.target.value, { state: '' })}>
            <option value="">Select country…</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )
    case 'state': {
      const opts = form.country === 'Canada' ? CA_PROVINCES : US_STATES
      const stateLabel = form.country === 'Canada' ? 'Province' : 'State'
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-state">{stateLabel}</label>
          <select id="field-state" className="form-select" value={form.state || ''} onChange={e => set('state', e.target.value)}>
            <option value="">Select…</option>
            {opts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )
    }
    case 'region':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-region">{col.label}</label>
          <input id="field-region" type="text" className="form-input" list="region-options"
            placeholder="e.g. North Conway"
            value={form.region || ''} onChange={e => set('region', e.target.value)} />
          <datalist id="region-options">
            {(form.state && locationOptions?.regions?.[form.state]
              ? locationOptions.regions[form.state]
              : Object.values(locationOptions?.regions ?? {}).flat()
            ).map(r => <option key={r} value={r} />)}
          </datalist>
        </div>
      )
    case 'address': {
      const val = form.address || ''
      const coordMatch = val.trim().match(/^(-?\d{1,3}\.?\d*)\s*[,\s]\s*(-?\d{1,3}\.?\d*)$/)
      const isCoords = coordMatch
        && Math.abs(parseFloat(coordMatch[1])) <= 90
        && Math.abs(parseFloat(coordMatch[2])) <= 180
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-address">{col.label}</label>
          <input id="field-address" type="text" className="form-input"
            placeholder="e.g. Hurricane Mountain Rd, Conway, NH  or  44.1234, -71.5678"
            value={val} onChange={e => set('address', e.target.value)} />
          {isCoords
            ? <span className="form-hint form-hint--ok">✓ Coordinates detected — drive time will work directly</span>
            : <span className="form-hint">Used to calculate drive time. You can also enter coordinates (lat, lng).</span>
          }
        </div>
      )
    }
    case 'trail_types':
      return (
        <div className="form-field">
          <label className="form-label">{col.label}</label>
          <div className="chip-group">
            {trailTypes.map(t => (
              <button key={t} type="button"
                className={`toggle-chip ${KNOWN_CHIP_CLASS[t] ?? ''} ${form.trail_types.includes(t) ? 'active' : ''}`}
                onClick={() => toggle('trail_types', t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )
    case 'difficulty':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-difficulty">{col.label}</label>
          <select id="field-difficulty" className="form-select" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
            <option value="">Select…</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      )
    case 'conditions':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-conditions">{col.label}</label>
          <select id="field-conditions" className="form-select" value={form.conditions} onChange={e => set('conditions', e.target.value)}>
            <option value="">Select…</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )
    case 'best_seasons':
      return (
        <div className="form-field">
          <label className="form-label">{col.label}</label>
          <div className="chip-group">
            {SEASONS.map(s => (
              <button key={s} type="button"
                className={`toggle-chip ${form.best_seasons.includes(s) ? 'active' : ''}`}
                onClick={() => toggle('best_seasons', s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )
    case 'personal_rating':
      return (
        <div className="form-field">
          <label className="form-label">{col.label}</label>
          <div className="star-picker">
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button"
                className={`star-btn ${form.personal_rating >= n ? 'filled' : ''}`}
                onClick={() => set('personal_rating', form.personal_rating === n ? null : n)}>★</button>
            ))}
            {form.personal_rating != null && (
              <button type="button" className="clear-rating" onClick={() => set('personal_rating', null)}>clear</button>
            )}
          </div>
        </div>
      )
    case 'distance_miles':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-distance">{col.label}</label>
          <div className="form-input-with-unit">
            <input id="field-distance" type="number" className="form-input" placeholder="15.3" step="0.1" min="0"
              value={form.distance_miles} onChange={e => set('distance_miles', e.target.value)} />
            <span className="form-input-unit">mi</span>
          </div>
        </div>
      )
    case 'elevation_gain_ft':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-elevation">{col.label}</label>
          <div className="form-input-with-unit">
            <input id="field-elevation" type="number" className="form-input" placeholder="2400" min="0"
              value={form.elevation_gain_ft} onChange={e => set('elevation_gain_ft', e.target.value)} />
            <span className="form-input-unit">ft</span>
          </div>
        </div>
      )
    case 'drive_time_minutes':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-drive">{col.label}</label>
          <div className="form-input-with-unit">
            <input id="field-drive" type="number" className="form-input" placeholder="90" min="0"
              value={form.drive_time_minutes} onChange={e => set('drive_time_minutes', e.target.value)} />
            <span className="form-input-unit">min</span>
          </div>
          <label className="form-lock-row" title="Lock this value — auto-refresh won't overwrite it">
            <input type="checkbox"
              checked={!!form.drive_time_locked}
              onChange={e => set('drive_time_locked', e.target.checked)} />
            <IconLock />
            <span>Lock — auto-refresh skips this location</span>
          </label>
        </div>
      )
    case 'trailforks_url':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-tf-url">{col.label}</label>
          <input id="field-tf-url" type="url" className="form-input" placeholder="https://www.trailforks.com/…"
            value={form.trailforks_url} onChange={e => {
              const url = e.target.value
              const m = url.match(/\/region\/[^/]+-(\d+)\/?/)
              const extra = (m && !form.trailforks_rid) ? { trailforks_rid: m[1] } : {}
              set('trailforks_url', url, extra)
            }} />
        </div>
      )
    case 'trailforks_rid':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-tf-rid">{col.label}</label>
          <input id="field-tf-rid" type="number" className="form-input" placeholder="e.g. 24103"
            value={form.trailforks_rid || ''} onChange={e => set('trailforks_rid', e.target.value)} />
          <span className="form-hint">Auto-filled from the URL if present, or find it at the bottom of your region's Trailforks page.</span>
        </div>
      )
    case 'notes':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor="field-notes">{col.label}</label>
          <textarea id="field-notes" className="form-textarea" rows={4} placeholder="Anything worth noting…"
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      )
    default:
      return null
  }
}

function CustomField({ col, value, onChange }) {
  const v = value ?? ''
  const id = `field-custom-${col.key}`
  switch (col.type) {
    case 'rating': {
      const n = value != null && value !== '' ? Number(value) : null
      return (
        <div className="form-field">
          <label className="form-label">{col.label}</label>
          <div className="star-picker">
            {[1,2,3,4,5].map(i => (
              <button key={i} type="button"
                className={`star-btn ${n >= i ? 'filled' : ''}`}
                onClick={() => onChange(n === i ? null : i)}>★</button>
            ))}
            {n != null && (
              <button type="button" className="clear-rating" onClick={() => onChange(null)}>clear</button>
            )}
          </div>
        </div>
      )
    }
    case 'boolean':
      return (
        <div className="form-field">
          <label className="form-checkbox-label">
            <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
            <span className="form-label" style={{ textTransform: 'none', fontSize: 13, letterSpacing: 0 }}>{col.label}</span>
          </label>
        </div>
      )
    case 'number':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor={id}>{col.label}</label>
          <input id={id} type="number" className="form-input" value={v} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'url':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor={id}>{col.label}</label>
          <input id={id} type="url" className="form-input" placeholder="https://…" value={v} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'textarea':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor={id}>{col.label}</label>
          <textarea id={id} className="form-textarea" rows={3} value={v} onChange={e => onChange(e.target.value)} />
        </div>
      )
    case 'select':
      return (
        <div className="form-field">
          <label className="form-label" htmlFor={id}>{col.label}</label>
          <select id={id} className="form-select" value={v} onChange={e => onChange(e.target.value)}>
            <option value="">Select…</option>
            {(col.options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )
    default:
      return (
        <div className="form-field">
          <label className="form-label" htmlFor={id}>{col.label}</label>
          <input id={id} type="text" className="form-input" value={v} onChange={e => onChange(e.target.value)} />
        </div>
      )
  }
}

// ── Main form ─────────────────────────────────────────────────────────────
export default function LocationForm({ form, onChange, columns = [], trailTypes = [], locationOptions = {} }) {
  const set = (key, val, extra = {}) => onChange({ ...form, [key]: val, ...extra })
  const setCustom = (key, val) => onChange({ ...form, custom: { ...(form.custom || {}), [key]: val } })
  const toggle = (key, val) => {
    const arr = form[key] || []
    set(key, arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const builtin = columns.filter(c => c.enabled && c.builtin)
  const custom  = columns.filter(c => c.enabled && !c.builtin)
  const has = (key) => builtin.some(c => c.key === key)
  const col = (key) => builtin.find(c => c.key === key)

  // ── Section: Identity ──────────────────────────────────────────────────
  const hasIdentity = has('country') || has('state') || has('region') || has('address')

  // Location field grid — country/state/region side by side when all present
  const locationGridCols = [has('country') && col('country'), has('state') && col('state'), has('region') && col('region')].filter(Boolean)

  // ── Section: Trail characteristics (+ custom fields fold in here) ────────
  const hasTrailInfo = has('trail_types') || has('difficulty') || has('conditions') || has('best_seasons') || has('personal_rating') || custom.length > 0
  const diffCondCols = [has('difficulty') && col('difficulty'), has('conditions') && col('conditions')].filter(Boolean)

  // ── Section: Metrics ───────────────────────────────────────────────────
  const metricCols = ['distance_miles','elevation_gain_ft','drive_time_minutes'].map(k => has(k) && col(k)).filter(Boolean)

  // ── Section: Trailforks ────────────────────────────────────────────────
  const hasTrailforks = has('trailforks_url') || has('trailforks_rid')

  // ── Section: Notes ─────────────────────────────────────────────────────
  const hasNotes = has('notes')

  return (
    <div className="location-form">

      {/* Name — always shown */}
      <div className="form-field">
        <label className="form-label" htmlFor="field-name">Name <span className="form-required">*</span></label>
        <input id="field-name" type="text" className="form-input" placeholder="e.g. Whistler Bike Park"
          value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
      </div>

      {/* ── Identity ── */}
      {hasIdentity && (
        <FormSection title="Location">
          {locationGridCols.length > 0 && (
            <div className={`form-row form-row-${locationGridCols.length}`}>
              {locationGridCols.map(c => (
                <BuiltinField key={c.key} col={c} form={form} set={set} toggle={toggle}
                  trailTypes={trailTypes} locationOptions={locationOptions} />
              ))}
            </div>
          )}
          {has('address') && (
            <BuiltinField col={col('address')} form={form} set={set} toggle={toggle}
              trailTypes={trailTypes} locationOptions={locationOptions} />
          )}
        </FormSection>
      )}

      {/* ── Trail characteristics + custom fields ── */}
      {hasTrailInfo && (
        <FormSection title="Trail Info">
          {has('trail_types') && (
            <BuiltinField col={col('trail_types')} form={form} set={set} toggle={toggle}
              trailTypes={trailTypes} locationOptions={locationOptions} />
          )}
          {diffCondCols.length > 0 && (
            <div className={`form-row form-row-${diffCondCols.length}`}>
              {diffCondCols.map(c => (
                <BuiltinField key={c.key} col={c} form={form} set={set} toggle={toggle}
                  trailTypes={trailTypes} locationOptions={locationOptions} />
              ))}
            </div>
          )}
          {has('best_seasons') && (
            <BuiltinField col={col('best_seasons')} form={form} set={set} toggle={toggle}
              trailTypes={trailTypes} locationOptions={locationOptions} />
          )}
          {has('personal_rating') && (
            <BuiltinField col={col('personal_rating')} form={form} set={set} toggle={toggle}
              trailTypes={trailTypes} locationOptions={locationOptions} />
          )}
          {/* Custom fields live here — shuttle, lift access, etc. belong with trail info */}
          {custom.map(c => (
            <CustomField key={c.key} col={c}
              value={form.custom?.[c.key]}
              onChange={val => setCustom(c.key, val)} />
          ))}
        </FormSection>
      )}

      {/* ── Metrics ── */}
      {metricCols.length > 0 && (
        <FormSection title="Metrics">
          <div className={`form-row form-row-${Math.min(metricCols.length, 3)}`}>
            {metricCols.map(c => (
              <BuiltinField key={c.key} col={c} form={form} set={set} toggle={toggle}
                trailTypes={trailTypes} locationOptions={locationOptions} />
            ))}
          </div>
        </FormSection>
      )}

      {/* ── Trailforks ── */}
      {hasTrailforks && (
        <FormSection title="Trailforks">
          {has('trailforks_url') && (
            <BuiltinField col={col('trailforks_url')} form={form} set={set} toggle={toggle}
              trailTypes={trailTypes} locationOptions={locationOptions} />
          )}
          {has('trailforks_rid') && (
            <BuiltinField col={col('trailforks_rid')} form={form} set={set} toggle={toggle}
              trailTypes={trailTypes} locationOptions={locationOptions} />
          )}
        </FormSection>
      )}

      {/* ── Notes — no section title, field label is sufficient ── */}
      {hasNotes && (
        <div className="form-section">
          <BuiltinField col={col('notes')} form={form} set={set} toggle={toggle}
            trailTypes={trailTypes} locationOptions={locationOptions} />
        </div>
      )}


    </div>
  )
}
