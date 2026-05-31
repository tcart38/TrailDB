import { useState, useEffect, useCallback, useMemo } from 'react'
import { getFilterType } from './utils/columns.js'
import Sidebar from './components/Sidebar.jsx'

const IconCar = ({ spinning }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    style={spinning ? { animation: 'spin 1s linear infinite' } : {}}>
    {spinning
      ? <><path d="M8 2a6 6 0 1 1-4.24 1.76"/><path d="M8 2v3"/></>
      : <><path d="M2 10h12"/><path d="M3.5 10V7.5l1.5-3h7l1.5 3V10"/><circle cx="5" cy="11.5" r="1.5"/><circle cx="11" cy="11.5" r="1.5"/></>
    }
  </svg>
)
import FilterBar from './components/FilterBar.jsx'
import LocationTable from './components/LocationTable.jsx'
import LocationPanel from './components/LocationPanel.jsx'
import MapPage from './components/MapPage.jsx'
import RawDataView from './components/RawDataView.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import { getLocations, getLocationOptions } from './api/locations.js'
import { getSettings, updateSetting, deleteTrailType, addColumn, deleteColumn } from './api/settings.js'
import { refreshDriveTimes } from './api/geo.js'

const DEFAULT_SORT = { col: 'name', dir: 'asc' }

export default function App() {
  const [page, setPage] = useState('database')

  // ── Theme ──────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  // ── Settings: trail types + column definitions ─────────────────────────
  const [trailTypes, setTrailTypes]           = useState([])
  const [trailTypeColors, setTrailTypeColors] = useState({})
  const [columns, setColumns]                 = useState([])
  const [locationOptions, setLocationOptions] = useState({ states: [], regions: {} })
  const [homeLocation, setHomeLocation]   = useState(null)
  const [mapboxToken, setMapboxToken]     = useState(null)

  const loadSettings = useCallback(async () => {
    try {
      const [s, opts] = await Promise.all([getSettings(), getLocationOptions()])
      setTrailTypes(s.trail_types ?? [])
      setTrailTypeColors(s.trail_type_colors ?? {})
      setColumns(s.columns ?? [])
      setLocationOptions(opts ?? { states: [], regions: {} })
      setHomeLocation(s.home_location ?? null)
      setMapboxToken(s.mapbox_token ?? null)
    } catch {}
  }, [])

  // ── Drive times ────────────────────────────────────────────────────────
  const [refreshingDrive, setRefreshingDrive] = useState(false)
  const [driveRefreshResult, setDriveRefreshResult] = useState(null)
  const handleRefreshDriveTimes = async () => {
    setRefreshingDrive(true)
    setDriveRefreshResult(null)
    try {
      const result = await refreshDriveTimes()
      setDriveRefreshResult(result)
      loadLocations()
    } catch (err) {
      setDriveRefreshResult({ error: err.message })
    } finally {
      setRefreshingDrive(false)
    }
  }
  useEffect(() => { loadSettings() }, [loadSettings])

  // ── Trail type handlers ────────────────────────────────────────────────
  const handleAddType = async (name) => {
    const updated = [...trailTypes, name]
    await updateSetting('trail_types', updated)
    setTrailTypes(updated)
  }
  const handleDeleteType = async (name) => {
    await deleteTrailType(name)
    setTrailTypes(prev => prev.filter(t => t !== name))
    loadLocations()
    setRefreshKey(k => k + 1)
  }
  const handleUpdateTypeColor = async (name, colorKey) => {
    const updated = { ...trailTypeColors, [name]: colorKey }
    setTrailTypeColors(updated)
    await updateSetting('trail_type_colors', updated)
  }

  // ── Column handlers ────────────────────────────────────────────────────
  const handleToggleColumn = async (key, enabled) => {
    const updated = columns.map(c => c.key === key ? { ...c, enabled } : c)
    setColumns(updated)
    await updateSetting('columns', updated)
  }
  const handleAddColumn = async (label, type) => {
    const newCol = await addColumn(label, type)
    setColumns(prev => [...prev, newCol])
  }
  const handleDeleteColumn = async (key) => {
    await deleteColumn(key)
    setColumns(prev => prev.filter(c => c.key !== key))
    loadLocations()
    setRefreshKey(k => k + 1)
  }

  // ── Trails column visibility + order (localStorage-persisted, view-level) ─
  const [hiddenTrailCols, setHiddenTrailCols] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('trailsHiddenCols') || '[]')) }
    catch { return new Set() }
  })
  const toggleTrailCol = (key) => {
    setHiddenTrailCols(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      localStorage.setItem('trailsHiddenCols', JSON.stringify([...next]))
      return next
    })
  }
  const resetTrailCols = () => {
    setHiddenTrailCols(new Set())
    localStorage.removeItem('trailsHiddenCols')
  }

  const [trailsColOrder, setTrailsColOrder] = useState(() => {
    try { const s = localStorage.getItem('trailsColOrder'); return s ? JSON.parse(s) : null }
    catch { return null }
  })
  const reorderTrailCols = (keys) => {
    setTrailsColOrder(keys)
    localStorage.setItem('trailsColOrder', JSON.stringify(keys))
  }

  // Enabled columns sorted by the user's preferred order
  const orderedTrailCols = useMemo(() => {
    const enabled = columns.filter(c => c.enabled)
    if (!trailsColOrder || trailsColOrder.length === 0) return enabled
    const idx = Object.fromEntries(trailsColOrder.map((k, i) => [k, i]))
    return [...enabled].sort((a, b) => (idx[a.key] ?? 9999) - (idx[b.key] ?? 9999))
  }, [columns, trailsColOrder])

  // ── Filter visibility (localStorage-persisted) ────────────────────────
  const [hiddenFilters, setHiddenFilters] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('hiddenFilters') || '[]')) }
    catch { return new Set() }
  })
  const toggleFilter = (key) => {
    setHiddenFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        setFilters(f => {
          const updated = { ...f }
          delete updated[key]
          delete updated[key + '_min']
          delete updated[key + '_max']
          return updated
        })
      }
      localStorage.setItem('hiddenFilters', JSON.stringify([...next]))
      return next
    })
  }
  const resetHiddenFilters = () => {
    setHiddenFilters(new Set())
    localStorage.removeItem('hiddenFilters')
  }

  // ── Database view state ────────────────────────────────────────────────
  const [allLocations, setAllLocations] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [filters, setFilters]           = useState({})
  const [sort, setSort]                 = useState(DEFAULT_SORT)
  const [nameSearch, setNameSearch]     = useState('')

  // ── Shared panel state ─────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState(null)
  const [isAdding, setIsAdding]     = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getLocations({ sort: sort.col, order: sort.dir })
      setAllLocations(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sort])

  useEffect(() => { loadLocations() }, [loadLocations])

  const countries = useMemo(() =>
    [...new Set(allLocations.map(l => l.country).filter(Boolean))].sort(),
    [allLocations]
  )

  const numericBounds = useMemo(() => {
    const bounds = {}
    for (const col of columns.filter(c => c.enabled && getFilterType(c) === 'range')) {
      const vals = allLocations
        .map(l => Number(col.builtin ? l[col.key] : l.custom?.[col.key]))
        .filter(v => !isNaN(v))
      bounds[col.key] = {
        min: 0,
        max: vals.length ? Math.ceil(Math.max(...vals)) : 100,
      }
    }
    return bounds
  }, [allLocations, columns])

  const locations = useMemo(() => {
    let result = allLocations

    if (nameSearch.trim()) {
      const q = nameSearch.toLowerCase()
      result = result.filter(l => l.name.toLowerCase().includes(q))
    }

    for (const col of columns.filter(c => c.enabled)) {
      const ft = getFilterType(col)
      if (!ft) continue

      if (ft === 'range') {
        const min = filters[col.key + '_min']
        const max = filters[col.key + '_max']
        const bounds = numericBounds[col.key] ?? {}
        const hasMin = min !== '' && min != null && Number(min) > (bounds.min ?? 0)
        const hasMax = max !== '' && max != null && Number(max) < (bounds.max ?? Infinity)
        if (!hasMin && !hasMax) continue
        result = result.filter(l => {
          const raw = col.builtin ? l[col.key] : l.custom?.[col.key]
          if (raw == null || raw === '') return true
          const v = Number(raw)
          if (isNaN(v)) return true
          if (hasMin && v < Number(min)) return false
          if (hasMax && v > Number(max)) return false
          return true
        })
      } else if (ft === 'tags') {
        const selected = Array.isArray(filters[col.key]) ? filters[col.key] : []
        if (!selected.length) continue
        result = result.filter(l =>
          selected.some(t => Array.isArray(l.trail_types) && l.trail_types.includes(t))
        )
      } else {
        const val = filters[col.key]
        if (!val && val !== false) continue
        result = result.filter(l => {
          const raw = col.builtin ? l[col.key] : l.custom?.[col.key]
          switch (ft) {
            case 'seasons':    return Array.isArray(l.best_seasons) && l.best_seasons.includes(val)
            case 'rating':     return raw != null && Number(raw) >= Number(val)
            case 'boolean':    return String(Boolean(raw)) === val
            case 'state':
            case 'region':
            case 'country':
            case 'difficulty':
            case 'conditions': return raw === val
            case 'text':       return String(raw ?? '').toLowerCase().includes(String(val).toLowerCase())
            default:           return true
          }
        })
      }
    }

    return result
  }, [allLocations, nameSearch, filters, columns, numericBounds])

  const panelLocation = useMemo(() => {
    if (!selectedId) return null
    return locations.find(l => l.id === selectedId)
      ?? allLocations.find(l => l.id === selectedId)
      ?? null
  }, [selectedId, locations, allLocations])

  const openAdd    = () => { setIsAdding(true); setSelectedId(null) }
  const openRow    = (loc) => { setSelectedId(loc.id); setIsAdding(false) }
  const closePanel = () => { setSelectedId(null); setIsAdding(false) }
  const afterSave  = () => { loadLocations(); setRefreshKey(k => k + 1); closePanel(); getLocationOptions().then(setLocationOptions).catch(() => {}) }
  const afterDelete = () => { loadLocations(); setRefreshKey(k => k + 1); closePanel(); getLocationOptions().then(setLocationOptions).catch(() => {}) }

  const handleNavigate = (p) => {
    setPage(p)
    closePanel()
    if (p === 'database') loadLocations()
  }

  const panelOpen = isAdding || selectedId != null
  const PAGE_TITLES = { database: 'Trails', map: 'Map', raw: 'All Data', settings: 'Settings' }

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={handleNavigate} />

      <div className="app-main">
        <header className="app-header">
          <h1 className="app-header-title">{PAGE_TITLES[page]}</h1>
          <div className="header-actions">
            {page === 'database' && homeLocation?.lat != null && mapboxToken && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={handleRefreshDriveTimes}
                  disabled={refreshingDrive}
                  title="Re-calculate drive times from home"
                >
                  <IconCar spinning={refreshingDrive} />
                  {refreshingDrive ? 'Calculating…' : 'Drive Times'}
                </button>
                {driveRefreshResult && !refreshingDrive && (
                  <span className={`drive-result ${driveRefreshResult.error ? 'drive-result-error' : 'drive-result-ok'}`}>
                    {driveRefreshResult.error
                      ? `Error: ${driveRefreshResult.error}`
                      : `Updated ${driveRefreshResult.updated} / ${driveRefreshResult.total}`}
                  </span>
                )}
              </>
            )}
            {page !== 'settings' && (
              <button className="btn btn-primary" onClick={openAdd}>
                <span className="btn-plus">+</span> Add Location
              </button>
            )}
          </div>
        </header>

        <div className="app-body">
          <div className="content-area">
            {page === 'database' && (
              <>
                <FilterBar
                  filters={filters} nameSearch={nameSearch}
                  onFiltersChange={setFilters} onNameSearch={setNameSearch}
                  trailTypes={trailTypes} columns={orderedTrailCols}
                  countries={countries}
                  numericBounds={numericBounds}
                  hiddenCols={hiddenTrailCols}
                  onToggleCol={toggleTrailCol}
                  onResetCols={resetTrailCols}
                  onReorderCols={reorderTrailCols}
                  hiddenFilters={hiddenFilters}
                  onToggleFilter={toggleFilter}
                  onResetFilters={resetHiddenFilters}
                  locationOptions={locationOptions}
                />
                {error && (
                  <div className="error-banner">
                    Failed to load: {error}
                    <button className="btn-link" onClick={loadLocations}>Retry</button>
                  </div>
                )}
                <LocationTable
                  locations={locations} loading={loading} sort={sort}
                  selectedId={selectedId} onSortChange={setSort}
                  onRowClick={openRow} columns={orderedTrailCols}
                  hiddenCols={hiddenTrailCols}
                  trailTypeColors={trailTypeColors}
                />
              </>
            )}

            {page === 'map' && (
              <>
                <FilterBar
                  filters={filters} nameSearch={nameSearch}
                  onFiltersChange={setFilters} onNameSearch={setNameSearch}
                  trailTypes={trailTypes} columns={orderedTrailCols}
                  countries={countries}
                  numericBounds={numericBounds}
                  hiddenCols={hiddenTrailCols}
                  onToggleCol={toggleTrailCol}
                  onResetCols={resetTrailCols}
                  onReorderCols={reorderTrailCols}
                  hiddenFilters={hiddenFilters}
                  onToggleFilter={toggleFilter}
                  onResetFilters={resetHiddenFilters}
                  locationOptions={locationOptions}
                />
                <MapPage
                  locations={locations}
                  selectedId={selectedId}
                  onRowClick={openRow}
                  mapboxToken={mapboxToken}
                  theme={theme}
                />
              </>
            )}

            {page === 'raw' && (
              <RawDataView
                selectedId={selectedId} onRowClick={openRow} refreshKey={refreshKey}
                onBulkDelete={() => { loadLocations(); setRefreshKey(k => k + 1) }}
                columns={columns}
              />
            )}

            {page === 'settings' && (
              <SettingsPage
                theme={theme} onThemeChange={setTheme}
                columns={columns}
                onToggleColumn={handleToggleColumn}
                onAddColumn={handleAddColumn}
                onDeleteColumn={handleDeleteColumn}
                trailTypes={trailTypes}
                trailTypeColors={trailTypeColors}
                onAddType={handleAddType}
                onDeleteType={handleDeleteType}
                onUpdateTypeColor={handleUpdateTypeColor}
                homeLocation={homeLocation}
                onHomeSaved={loc => setHomeLocation(loc)}
                mapboxToken={mapboxToken}
                onMapboxTokenSaved={t => setMapboxToken(t)}
              />
            )}
          </div>

          {panelOpen && (
            <LocationPanel
              location={isAdding ? null : panelLocation}
              onClose={closePanel} onSave={afterSave} onDelete={afterDelete}
              trailTypes={trailTypes} trailTypeColors={trailTypeColors}
              columns={columns} locationOptions={locationOptions}
            />
          )}
        </div>
      </div>

      {panelOpen && <div className="panel-backdrop" onClick={closePanel} />}
    </div>
  )
}
