import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#09090b',
        'bg-card': '#18181b',
        'bg-muted': '#27272a',
        border: 'rgba(63, 63, 70, 0.6)',
        accent: '#3b82f6',
        income: '#22c55e',
        expense: '#ef4444',
        savings: '#10b981',
        crypto: '#f59e0b',
      },
    },
  },
  plugins: [],
} satisfies Config
