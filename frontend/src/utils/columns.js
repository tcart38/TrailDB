// Returns the filter widget type for a column, or null if not filterable
export function getFilterType(col) {
  switch (col.type) {
    case 'url':
    case 'textarea':
      return null
    case 'number':
      return 'range'
    case 'boolean':
      return 'boolean'
    case 'difficulty':
      return 'difficulty'
    case 'tags':
      return 'tags'
    case 'seasons':
      return 'seasons'
    case 'conditions':
      return 'conditions'
    case 'rating':
      return 'rating'
    case 'state_province':
      return 'state'
    case 'country':
      return 'country'
    case 'text_autocomplete':
      return col.key === 'region' ? 'region' : 'text'
    case 'text':
    case 'select':
      return 'text'
    default:
      return null
  }
}

// Canonical field types and their display metadata
export const FIELD_TYPES = [
  { value: 'text',              label: 'Text' },
  { value: 'number',            label: 'Number' },
  { value: 'rating',            label: 'Star Rating (1–5)' },
  { value: 'boolean',           label: 'Yes / No' },
  { value: 'url',               label: 'URL' },
  { value: 'textarea',          label: 'Long Text' },
  { value: 'select',            label: 'Dropdown' },
  { value: 'text_autocomplete', label: 'Text (autocomplete)' },
]

export const FIELD_TYPE_LABELS = Object.fromEntries(FIELD_TYPES.map(t => [t.value, t.label]))

// Format drive time minutes into a readable string
export function formatDriveTime(minutes) {
  if (minutes == null) return null
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h} hr` : `${h} hr ${rem} min`
}

// Default empty value for a given type
export function defaultValue(type) {
  switch (type) {
    case 'boolean': return false
    case 'number':  return ''
    case 'select':  return ''
    default:        return ''
  }
}
