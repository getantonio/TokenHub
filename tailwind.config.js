/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
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
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "glow-success": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(34, 197, 94, 0.15)" },
          "50%": { boxShadow: "0 0 25px rgba(34, 197, 94, 0.3)" },
        },
        "glow-danger": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(239, 68, 68, 0.15)" },
          "50%": { boxShadow: "0 0 25px rgba(239, 68, 68, 0.3)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-success": "glow-success 4s ease-in-out infinite",
        "glow-danger": "glow-danger 4s ease-in-out infinite"
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
}