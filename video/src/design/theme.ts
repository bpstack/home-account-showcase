// Design tokens matching the app's dark mode palette

export const COLORS = {
  bg: '#09090b',
  bgCard: '#18181b',
  bgMuted: '#27272a',
  bgHover: '#3f3f46',

  textPrimary: '#f3f4f6',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',

  accent: '#3b82f6',
  accentLight: '#60a5fa',

  green: '#22c55e',
  red: '#ef4444',
  emerald: '#10b981',
  amber: '#f59e0b',
  purple: '#a855f7',
  blue: '#3b82f6',
  cyan: '#06b6d4',

  // Chart colors (from Recommendations.tsx)
  stocks: '#22c55e',
  bonds: '#3b82f6',
  crypto: '#f59e0b',
  cash: '#6b7280',

  border: 'rgba(63, 63, 70, 0.6)',
  borderLight: 'rgba(63, 63, 70, 0.3)',
} as const

export const FONTS = {
  heading: "'Inter', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const
