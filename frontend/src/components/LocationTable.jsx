import { formatDriveTime } from '../utils/columns.js'
import { getTagStyle } from '../utils/constants.js'

// ── Cell renderers ────────────────────────────────────────────────────────
const Dash = () => <span className="cell-empty">—</span>

const DifficultyBadge = ({ v }) => {
  if (!v) return <Dash />
  const cls = { Green: 'badge-green', Blue: 'badge-blue', Black: 'badge-black', 'Double Black': 'badge-dblack' }[v] || ''
  return <span className={`badge ${cls}`}>{v}</span>
}
const ConditionsBadge = ({ v }) => {
  if (!v) return <Dash />
  const cls = { Perfect: 'badge-perfect', Good: 'badge-good', Wet: 'badge-wet', Closed: 'badge-closed' }[v] || ''
  return <span className={`badge ${cls}`}>{v}</span>
}
const TYPE_PALETTE = ['tag-xc','tag-enduro','tag-dh','tag-flow','tag-tech','tag-jumps','tag-alt1','tag-alt2']
const typeClass = (t) => {
  let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0
  return TYPE_PALETTE[h % TYPE_PALETTE.length]
}
const TypeTag = ({ t, colors = {} }) => {
  const style = getTagStyle(colors[t])
  return <span className={`tag${style ? '' : ` ${typeClass(t)}`}`} style={style ?? {}}>{t}</span>
}
const SeasonChip = ({ s }) => <span className="tag tag-season" title={s}>{s.slice(0, 3)}</span>
const Stars = ({ n }) => {
  if (!n) return <Dash />
  return <span className="stars">{[1,2,3,4,5].map(i => <span key={i} className={`star ${i<=n?'filled':'empty'}`}>★</span>)}</span>
}

function cellValue(col, loc) {
  return col.builtin ? loc[col.key] : (loc.custom?.[col.key] ?? null)
}

function renderCell(col, loc, trailTypeColors = {}) {
  const v = cellValue(col, loc)
  const empty = v == null || v === '' || (Array.isArray(v) && v.length === 0)

  switch (col.type) {
    case 'tags':
      return empty ? <Dash /> : <div className="cell-types">{v.map(t => <TypeTag key={t} t={t} colors={trailTypeColors} />)}</div>
    case 'difficulty':
      return <DifficultyBadge v={v} />
    case 'conditions':
      return <ConditionsBadge v={v} />
    case 'seasons':
      return empty ? <Dash /> : <div className="cell-seasons">{v.map(s => <SeasonChip key={s} s={s} />)}</div>
    case 'rating':
      return <Stars n={v} />
    case 'number':
      if (col.key === 'drive_time_minutes') {
        const fmt = formatDriveTime(v)
        return fmt ? <span>{fmt}</span> : <Dash />
      }
      return empty ? <Dash /> : <span>{typeof v === 'number' ? v.toLocaleString() : v}</span>
    case 'url':
      return empty ? <Dash /> : (
        <a href={v} target="_blank" rel="noopener noreferrer" className="name-link"
           onClick={e => e.stopPropagation()} title="Open link">↗</a>
      )
    case 'boolean':
      return v == null ? <Dash /> : <span>{v ? '✓' : '✗'}</span>
    case 'textarea':
      return empty ? <Dash /> : <span className="cell-truncate" title={v}>{v.length > 40 ? v.slice(0,40)+'…' : v}</span>
    case 'text_autocomplete':
      return empty ? <Dash /> : <span>{String(v)}</span>
    default:
      return empty ? <Dash /> : <span>{String(v)}</span>
  }
}

// ── Sort indicator ────────────────────────────────────────────────────────
const SORTABLE_TYPES = new Set(['difficulty','number','rating','conditions','text'])

const SortIndicator = ({ col, sort }) => {
  if (sort.col !== col.key) return <span className="sort-icon">↕</span>
  return <span className="sort-icon active">{sort.dir === 'asc' ? '↑' : '↓'}</span>
}

// ── Component ─────────────────────────────────────────────────────────────
export default function LocationTable({ locations, loading, sort, selectedId, onSortChange, onRowClick, columns = [], hiddenCols = new Set(), trailTypeColors = {} }) {
  const enabledCols = columns.filter(c => c.enabled && !hiddenCols.has(c.key))

  const handleSort = (col) => {
    if (!SORTABLE_TYPES.has(col.type)) return
    onSortChange(prev =>
      prev.col === col.key
        ? { col: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col: col.key, dir: 'asc' }
    )
  }

  return (
    <div className="table-container">
      <table className="location-table">
        <thead>
          <tr>
            <th>Name</th>
            {enabledCols.map(col => {
              const sortable = SORTABLE_TYPES.has(col.type)
              return (
                <th key={col.key} className={sortable ? 'sortable' : ''} onClick={() => handleSort(col)}>
                  {col.label}
                  {sortable && <SortIndicator col={col} sort={sort} />}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={enabledCols.length + 1} className="table-state">Loading…</td></tr>
          ) : locations.length === 0 ? (
            <tr><td colSpan={enabledCols.length + 1} className="table-state">No locations found — add one to get started!</td></tr>
          ) : locations.map(loc => (
            <tr
              key={loc.id}
              className={`location-row${selectedId === loc.id ? ' selected' : ''}`}
              onClick={() => onRowClick(loc)}
            >
              <td>
                <div className="cell-name">
                  <span className="name-text">{loc.name}</span>
                  {loc.trailforks_url && (
                    <a href={loc.trailforks_url} target="_blank" rel="noopener noreferrer"
                       className="name-link" onClick={e => e.stopPropagation()} title="Open trail page">↗</a>
                  )}
                </div>
              </td>
              {enabledCols.map(col => (
                <td key={col.key}>{renderCell(col, loc, trailTypeColors)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
