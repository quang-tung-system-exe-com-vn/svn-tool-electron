export type SvnStatusCode = 'A' | 'M' | 'D' | 'R' | 'C' | 'X' | 'I' | '?' | '!' | '~'

export const STATUS_TEXT: Record<SvnStatusCode, string> = {
  A: 'svnStatus.added',
  M: 'svnStatus.modified',
  D: 'svnStatus.deleted',
  R: 'svnStatus.replaced',
  C: 'svnStatus.conflicted',
  X: 'svnStatus.external',
  I: 'svnStatus.ignored',
  '?': 'svnStatus.unversioned',
  '!': 'svnStatus.missing',
  '~': 'svnStatus.typeChanged',
}

export const STATUS_COLOR_CLASS_MAP = {
  A: 'text-green-600 dark:text-green-400',
  M: 'text-blue-600 dark:text-blue-400',
  D: 'text-red-600 dark:text-red-400',
  R: 'text-orange-500 dark:text-orange-300',
  C: 'text-purple-600 dark:text-purple-400',
  X: 'text-gray-600 dark:text-gray-400',
  I: 'text-yellow-700 dark:text-yellow-500',
  '?': 'text-gray-800 dark:text-gray-300',
  '!': 'text-rose-600 dark:text-rose-400',
  '~': 'text-indigo-600 dark:text-indigo-400',
}

export const FONT_SIZES = ['small', 'medium', 'large'] as const
export const FONT_FAMILIES = ['sans', 'serif', 'mono'] as const
export const BUTTON_VARIANTS = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'ja', label: '日本語' },
]
