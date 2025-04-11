export type SvnStatusCode = 'A' | 'M' | 'D' | 'R' | 'C' | 'X' | 'I' | '?' | '!' | '~'

export const STATUS_TEXT: Record<SvnStatusCode, string> = {
  A: 'Added',
  M: 'Modified',
  D: 'Deleted',
  R: 'Replaced',
  C: 'Conflicted',
  X: 'External',
  I: 'Ignored',
  '?': 'Unversioned',
  '!': 'Missing',
  '~': 'Type Changed',
}

export const STATUS_COLOR_MAP_LIGHT: Record<SvnStatusCode, string> = {
  A: '#7DDC82',
  M: '#66B2FF',
  D: '#FF6B6B',
  R: '#FFD86B',
  C: '#D1A0E5',
  X: '#A9A9A9',
  I: '#DA8C4D',
  '?': '#F8F9FA',
  '!': '#F8D7DA',
  '~': '#D6A4E4',
}

export const STATUS_COLOR_MAP_DARK: Record<SvnStatusCode, string> = {
  A: '#28A745',
  M: '#007BFF',
  D: '#DC3545',
  R: '#FFC107',
  C: '#6F42C1',
  X: '#6C757D',
  I: '#B5672A',
  '?': '#343A40',
  '!': '#721C24',
  '~': '#6610F2',
}

export const FONT_SIZES = ['small', 'medium', 'large'] as const
export const FONT_FAMILIES = ['sans', 'serif', 'mono'] as const
export const BUTTON_VARIANTS = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'ja', label: '日本語' },
]
