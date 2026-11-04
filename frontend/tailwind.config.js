/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#0a0d12',
          900: '#10141d',
          800: '#171d2b',
          700: '#232b3e',
          600: '#343f56',
        },
        brand: {
          50: '#eefcf6',
          100: '#d7f7e9',
          200: '#b2edd3',
          300: '#7dddb8',
          400: '#43c498',
          500: '#10b981', // Emerald accent
          600: '#059669',
          700: '#047857',
        },
        accent: {
          teal: '#14b8a6',
          cyan: '#06b6d4',
          indigo: '#6366f1',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
