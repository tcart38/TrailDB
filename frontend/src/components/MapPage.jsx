import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

function mapStyle(theme) {
  return theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/outdoors-v12'
}

export default function MapPage({ locations, selectedId, onRowClick, mapboxToken, theme }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef({})    // id → { marker, el }
  const [ready, setReady] = useState(false)

  // ── Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapboxToken || !containerRef.current) return

    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: mapStyle(theme),
      center: [-105, 40],
      zoom: 4,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => setReady(true))

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [mapboxToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme changes ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return
    mapRef.current.setStyle(mapStyle(theme))
  }, [theme, ready])

  // ── Build / rebuild markers when filtered locations change ──────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    // Clear previous markers
    Object.values(markersRef.current).forEach(({ marker }) => marker.remove())
    markersRef.current = {}

    const withCoords = locations.filter(l => l.lat != null && l.lng != null)

    withCoords.forEach(loc => {
      const el = document.createElement('div')
      el.className = `map-marker${selectedId === loc.id ? ' map-marker--selected' : ''}`

      // Hover popup — set lngLat explicitly so addTo works without setPopup()
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 18,
        anchor: 'bottom',
        className: 'map-popup',
        maxWidth: 'none',
      })

      const meta = [loc.region, loc.state].filter(Boolean).join(', ')
      popup
        .setLngLat([loc.lng, loc.lat])
        .setHTML(
          `<div class="map-popup-name">${loc.name}</div>${
            meta ? `<div class="map-popup-meta">${meta}</div>` : ''
          }`
        )

      el.addEventListener('mouseenter', () => popup.addTo(map))
      el.addEventListener('mouseleave', () => popup.remove())
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        map.flyTo({ center: [loc.lng, loc.lat], zoom: Math.max(map.getZoom(), 9), duration: 400 })
        onRowClick(loc)
      })

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map)

      markersRef.current[loc.id] = { marker, el }
    })

    // Fit map to visible markers
    if (withCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      withCoords.forEach(l => bounds.extend([l.lng, l.lat]))
      map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 800 })
    } else if (withCoords.length === 1) {
      map.flyTo({ center: [withCoords[0].lng, withCoords[0].lat], zoom: 10, duration: 600 })
    }
  }, [ready, locations, onRowClick]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync selected marker styling without rebuilding everything ───────────
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { el }]) => {
      const sel = Number(id) === selectedId
      el.className = `map-marker${sel ? ' map-marker--selected' : ''}`
    })
  }, [selectedId])

  const withCoords   = locations.filter(l => l.lat != null && l.lng != null)
  const missingCount = locations.length - withCoords.length

  if (!mapboxToken) {
    return (
      <div className="map-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <p>Add a Mapbox token in Settings to enable the map.</p>
      </div>
    )
  }

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-container" />
      {missingCount > 0 && (
        <div className="map-note">
          {missingCount} location{missingCount !== 1 ? 's' : ''} not shown — no coordinates
        </div>
      )}
    </div>
  )
}
