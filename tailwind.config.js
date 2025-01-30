/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#111827',
          primary: '#111827',    // Main background
          secondary: '#1F2937',  // Card/form background
          accent: '#374151',     // Hover states
          dark: '#0F172A',       // Header/footer
        },
        text: {
          primary: '#F9FAFB',    // Main text
          secondary: '#D1D5DB',  // Secondary text
          accent: '#3B82F6',     // Links and accents
        },
        indigo: {
          600: '#4F46E5',
          700: '#4338CA',
        },
        blue: {
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        green: {
          400: '#34D399',
          500: '#10B981',
          900: '#064E3B',
        },
        border: {
          DEFAULT: '#374151',
          hover: '#4B5563',
        }
      },
      keyframes: {
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        'expand': {
          '0%': {
            height: '0',
            opacity: '0'
          },
          '100%': {
            height: 'auto',
            opacity: '1'
          }
        },
        'slide-up': {
          '0%': {
            transform: 'translateY(10px)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1'
          }
        }
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.5s ease-out',
        'expand': 'expand 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out'
      }
    },
  },
  plugins: [],
}