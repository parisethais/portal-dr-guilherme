import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D2B6B',   // MedEn índigo
          light:   '#7A9E7E',   // sage
          lighter: '#A8C5AC',   // sage claro
          dark:    '#1E1C4A',   // índigo escuro
        },
        sage: {
          DEFAULT: '#7A9E7E',
          light:   '#A8C5AC',
          dark:    '#4E7A52',
        },
        bone: '#F5F0E8',        // warm bone background
      },
      fontFamily: {
        sans:    ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        display: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
