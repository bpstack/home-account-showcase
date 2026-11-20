// Design tokens copied from the app's dark theme (frontend/app/globals.css, `.dark`)

export const COLORS = {
  // Surfaces: page, raised surface (cards, bars, menus), muted fill, lines
  bg: '#12161c',
  surface: '#1a1f27',
  muted: '#222833',
  line: '#2a313c',

  // Ink
  text: '#e8ebf0',
  textSecondary: '#9aa3af',

  // The one accent (petrol) and the text that goes on it
  accent: '#3fb2bc',
  accentInk: '#0b1d1f',

  // Status: income, warning, expense
  success: '#4cc38a',
  warning: '#e0a43a',
  danger: '#f07167',

  // Brand mark gradient (the "HA" logo, the one gradient the app keeps)
  brandFrom: '#10b981',
  brandTo: '#3b82f6',
} as const

/** A colour with alpha, from a #rrggbb token. */
export const alpha = (hex: string, a: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export const FONTS = {
  sans: "'Ubuntu', system-ui, sans-serif",
  mono: "'Ubuntu Mono', ui-monospace, monospace",
} as const

/** Category dots, as a user would pick them: muted, none of them green or red. */
export const CATEGORY_COLORS = {
  food: '#3fb2bc',
  home: '#e0a43a',
  transport: '#8b9cf7',
  leisure: '#d57fb0',
  health: '#7cc4e8',
  shopping: '#b39ddb',
  income: '#4cc38a',
  other: '#9aa3af',
} as const
