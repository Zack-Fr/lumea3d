import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#F8CC3E',
          plum: '#311317',
          stone: '#A09F92',
          black: '#030201',
        }
      },
      borderRadius: { '2xl': '1.25rem' }
    },
  },
  plugins: [],
} satisfies Config
