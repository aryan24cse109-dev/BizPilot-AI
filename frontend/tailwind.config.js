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
        // Master Design System Colors
        canvas: {
          light: '#FAFAF7', // Warm white
          dark: '#15191B',  // Deep charcoal
        },
        surface: {
          light: '#F1F3F0', // Secondary surface light
          dark: '#1C2225',  // Secondary surface dark
          darker: '#111416',
        },
        emerald: {
          primary: '#17A673', // Main Emerald Accent
          muted: '#DDF5E9',   // Light Muted Green
          dark: '#116B4D',    // Deep Forest Green
          hover: '#138c60',
        },
        charcoal: {
          950: '#15191B',
          900: '#1C2225',
          850: '#22292D',
          800: '#2A3338',
          700: '#3D4950',
          600: '#54636B',
        },
        brand: {
          50: '#F2FAF6',
          100: '#DDF5E9',
          200: '#B4E8D1',
          300: '#7CD6B0',
          400: '#43BE8E',
          500: '#17A673',
          600: '#138C60',
          700: '#116B4D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 12px 0 rgba(0, 0, 0, 0.05)',
        'modal': '0 20px 40px -15px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [],
}
