/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          dark: '#1B4D3E',
          DEFAULT: '#2D6A4F',
          light: '#52B788',
        },
        hydro: {
          dark: '#0F4C81',
          DEFAULT: '#1E6091',
          light: '#52B69A',
        },
        alert: {
          red: '#C92A2A',
          orange: '#D9480F',
          yellow: '#E67700',
          green: '#2B8A3E',
        },
        command: {
          bg: '#0A0F1D',
          panel: '#111827',
          border: '#1F2937',
          text: '#F3F4F6',
          muted: '#9CA3AF',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
