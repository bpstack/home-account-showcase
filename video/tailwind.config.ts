import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#12161c',
        surface: '#1a1f27',
        muted: '#222833',
        line: '#2a313c',
        accent: '#3fb2bc',
        income: '#4cc38a',
        expense: '#f07167',
      },
    },
  },
  plugins: [],
} satisfies Config
