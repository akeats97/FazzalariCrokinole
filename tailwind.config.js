/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FBFBE2',
          dark: '#F0F0CC',
          card: '#F5F5DC',
        },
        forest: {
          DEFAULT: '#006241',
          light: '#007a52',
          dark: '#004d31',
        },
        rosso: {
          DEFAULT: '#B61629',
          light: '#cc1a2f',
          dark: '#8c1020',
        },
        ink: {
          DEFAULT: '#1B1D0E',
          light: '#3a3d1c',
          muted: '#6b6e56',
          faint: '#9c9f80',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#e8c547',
          dark: '#b08f20',
        },
      },
      fontFamily: {
        headline: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
