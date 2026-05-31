const IconTrails = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2L2.5 13h11L8 2z" />
    <path d="M8 8.5L5.5 13h5L8 8.5z" />
  </svg>
)

const IconTable = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="2" y="2" width="12" height="12" rx="1.5" />
    <line x1="2" y1="5.5" x2="14" y2="5.5" />
    <line x1="6" y1="5.5" x2="6" y2="14" />
  </svg>
)

const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5C5.52 1.5 3.5 3.52 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.48-2.02-4.5-4.5-4.5z"/>
    <circle cx="8" cy="6" r="1.5"/>
  </svg>
)

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="2" />
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M2.93 2.93l1.07 1.07M12 12l1.07 1.07M13.07 2.93L12 4M4 12l-1.07 1.07" />
  </svg>
)

const LogoMark = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <rect width="26" height="26" rx="7" fill="var(--accent)" />
    <path d="M13 5L5 19h16L13 5z" fill="white" fillOpacity="0.95" />
    <path d="M13 12.5L10 19h6L13 12.5z" fill="white" fillOpacity="0.35" />
  </svg>
)

const ITEMS = [
  { id: 'database', label: 'Trails',   Icon: IconTrails   },
  { id: 'map',      label: 'Map',      Icon: IconMap      },
  { id: 'raw',      label: 'All Data', Icon: IconTable    },
  { id: 'settings', label: 'Settings', Icon: IconSettings },
]

export default function Sidebar({ page, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <LogoMark />
        <span className="sidebar-name">TrailDB</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`sidebar-item${page === id ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-current={page === id ? 'page' : undefined}
          >
            <span className="sidebar-item-icon"><Icon /></span>
            <span className="sidebar-item-label">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
