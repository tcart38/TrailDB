import { useState } from 'react'
import ColumnsManager from './ColumnsManager.jsx'
import TypesManager from './TypesManager.jsx'
import { geocode } from '../api/geo.js'
import { updateSetting } from '../api/settings.js'

function MapboxTokenSection({ mapboxToken, onSaved }) {
  const [token, setToken] = useState(mapboxToken ?? '')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await updateSetting('mapbox_token', token.trim())
    onSaved(token.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
      <div className="settings-row-info">
        <span className="settings-row-label">Mapbox Token</span>
        <span className="settings-row-desc">
          Required for geocoding and drive time calculation.{' '}
          <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer">
            Get a free token at mapbox.com →
          </a>
          {' '}(no credit card, 100k requests/month free)
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <input
          type="password"
          className="form-input"
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
          placeholder="pk.eyJ1Ijoi..."
          value={token}
          onChange={e => { setToken(e.target.value); setSaved(false) }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!token.trim()}
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      {mapboxToken && (
        <span style={{ fontSize: 12, color: 'var(--success)' }}>✓ Token configured</span>
      )}
    </div>
  )
}

function HomeLocationSection({ homeLocation, onSaved }) {
  const [address, setAddress] = useState(homeLocation?.address ?? '')
  const [status, setStatus]   = useState('')
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    if (!address.trim()) return
    setStatus('loading')
    setMessage('')
    try {
      const result = await geocode(address.trim())
      const loc = { address: address.trim(), lat: result.lat, lng: result.lng }
      await updateSetting('home_location', loc)
      onSaved(loc)
      setStatus('saved')
      setMessage(`📍 ${result.display_name}`)
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  const coords = homeLocation?.lat != null
    ? `${homeLocation.lat.toFixed(4)}, ${homeLocation.lng.toFixed(4)}`
    : null

  return (
    <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
      <div className="settings-row-info">
        <span className="settings-row-label">Home Address</span>
        <span className="settings-row-desc">
          Used to auto-calculate drive times. Updated at most monthly per location.
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <input
          type="text"
          className="form-input"
          style={{ flex: 1 }}
          placeholder="e.g. 123 Main St, Portland, OR 97201"
          value={address}
          onChange={e => setAddress(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={status === 'loading' || !address.trim()}
        >
          {status === 'loading' ? 'Geocoding…' : 'Save & Geocode'}
        </button>
      </div>
      {coords && status !== 'error' && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {status === 'saved' ? '✓ Saved — ' : 'Current: '}
          {message || coords}
        </span>
      )}
      {status === 'error' && (
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>{message}</span>
      )}
    </div>
  )
}

export default function SettingsPage({
  theme, onThemeChange,
  columns, onToggleColumn, onAddColumn, onDeleteColumn,
  trailTypes, trailTypeColors, onAddType, onDeleteType, onUpdateTypeColor,
  homeLocation, onHomeSaved,
  mapboxToken, onMapboxTokenSaved,
}) {
  return (
    <div className="settings-page">
      <div className="settings-section">
        <h2 className="settings-section-title">Appearance</h2>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-label">Theme</span>
            <span className="settings-row-desc">Choose your preferred color scheme</span>
          </div>
          <div className="theme-switcher">
            <button
              className={`theme-opt${theme === 'dark' ? ' active' : ''}`}
              onClick={() => onThemeChange('dark')}
            >
              <span className="theme-opt-icon">🌙</span>
              Dark
            </button>
            <button
              className={`theme-opt${theme === 'light' ? ' active' : ''}`}
              onClick={() => onThemeChange('light')}
            >
              <span className="theme-opt-icon">☀️</span>
              Light
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Home Location</h2>
        <MapboxTokenSection mapboxToken={mapboxToken} onSaved={onMapboxTokenSaved} />
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <HomeLocationSection homeLocation={homeLocation} onSaved={onHomeSaved} />
        </div>
      </div>

      <div className="settings-section settings-section-manager">
        <h2 className="settings-section-title">Data Columns</h2>
        <div className="settings-manager-body">
          <ColumnsManager
            columns={columns}
            onToggle={onToggleColumn}
            onAdd={onAddColumn}
            onDelete={onDeleteColumn}
          />
        </div>
      </div>

      <div className="settings-section settings-section-manager">
        <h2 className="settings-section-title">Trail Types</h2>
        <div className="settings-manager-body">
          <TypesManager
            types={trailTypes} colors={trailTypeColors}
            onAdd={onAddType} onDelete={onDeleteType} onUpdateColor={onUpdateTypeColor}
          />
        </div>
      </div>
    </div>
  )
}
