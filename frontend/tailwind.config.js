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
        // Colors extracted from reference design
        zarss: {
          beige: '#EFECE6',         // Outer application background
          cream: '#FAF8F5',         // Light inner surface
          dark: '#1C1D22',          // Sidebar & dark capsule bars
          darker: '#16171B',        // Deepest dark
          gold: '#F5C869',          // Active sidebar accent & indicators
          goldMuted: '#ECCB6F',
          goldDark: '#3A2E12',
          sage: '#CFDDC8',          // KPI 1 pastel sage
          sagePill: '#B6C8AE',
          sageDark: '#20331E',
          periwinkle: '#8E9EF8',    // KPI 3 pastel purple / periwinkle
          periwinkleBtn: '#5D6FE8',
          periwinkleDark: '#4C5FD6',
          track: '#EFECE6',         // Capsule chart track background
          textMuted: '#8E9297',     // Sidebar inactive items
        },
        // Master Design System Colors
        canvas: {
          light: '#EFECE6', // Warm stone beige
          dark: '#141518',  // Deep charcoal
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1C1D22',
          secondary: '#FAF8F5',
        },
        emerald: {
          primary: '#17A673',
          muted: '#DDF5E9',
          dark: '#116B4D',
          hover: '#138c60',
        },
        charcoal: {
          950: '#141518',
          900: '#1C1D22',
          850: '#23252B',
          800: '#2B2E36',
          700: '#3D424D',
          600: '#545B6B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        'app': '2.25rem', // 36px smooth frame radius like the reference image
      },
      boxShadow: {
        'app-frame': '0 25px 60px -15px rgba(0, 0, 0, 0.12), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 14px 0 rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
