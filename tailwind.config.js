/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#0F172A',   // Dark blue-gray
          secondary: '#1E293B', // Slightly lighter blue-gray
          accent: '#334155',    // Medium blue-gray for cards/sections
        },
        text: {
          primary: '#E2E8F0',   // Light gray
          secondary: '#94A3B8',  // Muted text
          accent: '#1E40AF',    // Darker blue accent for buttons
        },
        border: {
          DEFAULT: '#334155',   // Medium blue-gray
          light: '#475569',     // Lighter border for hover states
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
        }
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.5s ease-out'
      }
    },
  },
  plugins: [],
} 