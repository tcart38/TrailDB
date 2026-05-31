export const COUNTRIES = ['USA', 'Canada']

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia',
]

export const CA_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
  'Saskatchewan', 'Yukon',
]

export const TRAIL_TYPES = ['XC', 'Enduro', 'DH', 'Flow', 'Tech']

export const TAG_PRESETS = [
  { id: 'teal',   label: 'Teal',   swatch: '#0d9488', light: { bg: '#ccfbf1', text: '#0f766e' }, dark: { bg: '#0d2a27', text: '#2dd4bf' } },
  { id: 'orange', label: 'Orange', swatch: '#ea580c', light: { bg: '#ffedd5', text: '#9a3412' }, dark: { bg: '#291607', text: '#fb923c' } },
  { id: 'red',    label: 'Red',    swatch: '#dc2626', light: { bg: '#fee2e2', text: '#991b1b' }, dark: { bg: '#2c0f0f', text: '#f87171' } },
  { id: 'green',  label: 'Green',  swatch: '#16a34a', light: { bg: '#dcfce7', text: '#15803d' }, dark: { bg: '#0d2c1a', text: '#4ade80' } },
  { id: 'purple', label: 'Purple', swatch: '#7c3aed', light: { bg: '#ede9fe', text: '#6d28d9' }, dark: { bg: '#1e1035', text: '#c084fc' } },
  { id: 'amber',  label: 'Amber',  swatch: '#d97706', light: { bg: '#fef3c7', text: '#92400e' }, dark: { bg: '#2a1f00', text: '#fbbf24' } },
  { id: 'blue',   label: 'Blue',   swatch: '#2563eb', light: { bg: '#dbeafe', text: '#1e40af' }, dark: { bg: '#0f1e3d', text: '#93c5fd' } },
  { id: 'pink',   label: 'Pink',   swatch: '#db2777', light: { bg: '#fce7f3', text: '#9d174d' }, dark: { bg: '#2d0f20', text: '#f9a8d4' } },
  { id: 'slate',  label: 'Slate',  swatch: '#475569', light: { bg: '#e2e8f0', text: '#334155' }, dark: { bg: '#1e293b', text: '#94a3b8' } },
  { id: 'lime',   label: 'Lime',   swatch: '#65a30d', light: { bg: '#ecfccb', text: '#3f6212' }, dark: { bg: '#1a2e05', text: '#a3e635' } },
]

export function getTagStyle(colorKey) {
  if (!colorKey) return null
  const isDark = document.documentElement.dataset.theme !== 'light'
  if (colorKey.startsWith('#')) {
    return { background: colorKey + '28', color: colorKey }
  }
  const preset = TAG_PRESETS.find(p => p.id === colorKey)
  if (!preset) return null
  const v = isDark ? preset.dark : preset.light
  return { background: v.bg, color: v.text }
}
export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter']
export const DIFFICULTIES = ['Green', 'Blue', 'Black', 'Double Black']
export const CONDITIONS = ['Perfect', 'Good', 'Wet', 'Closed']

export const EMPTY_FORM = {
  name: '',
  trail_types: [],
  difficulty: '',
  distance_miles: '',
  elevation_gain_ft: '',
  drive_time_minutes: '',
  best_seasons: [],
  personal_rating: null,
  conditions: '',
  trailforks_url: '',
  notes: '',
}
