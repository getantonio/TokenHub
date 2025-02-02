/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: {
          DEFAULT: "hsl(var(--background))",
          primary: '#0F172A',    // Darker background
          secondary: '#1E293B',  // Card/form background
          accent: '#334155',     // Hover states
          dark: '#0F172A',       // Header/footer
        },
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: '#3B82F6',    // Primary blue
          hover: '#2563EB',      // Darker blue for hover
          light: '#60A5FA',      // Lighter blue for accents
        },
        secondary: {
          DEFAULT: '#64748B',    // Secondary gray
          hover: '#475569',      // Darker gray for hover
        },
        destructive: {
          DEFAULT: '#EF4444',    // Red for destructive actions
          hover: '#DC2626',      // Darker red for hover
        },
        text: {
          primary: '#F8FAFC',    // Main text
          secondary: '#94A3B8',  // Secondary text
          accent: '#3B82F6',     // Blue accent text
        },
        border: {
          DEFAULT: '#334155',    // Border color
          hover: '#475569',      // Border hover color
        },
        button: {
          primary: '#3B82F6',    // Primary button color
          hover: '#2563EB',      // Button hover color
          disabled: '#64748B',   // Disabled button color
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-in-out',
        'slide-down': 'slideDown 0.3s ease-in-out',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
}