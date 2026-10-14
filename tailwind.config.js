/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light/dark mode color scheme via CSS variables
        background: 'rgb(var(--color-background) / <alpha-value>)',
        sidebar: '#0F172A',
        primary: '#2563EB',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        cardBorder: 'rgb(var(--color-card-border) / <alpha-value>)',
        textMain: 'rgb(var(--color-text-main) / <alpha-value>)',
        textSecondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
        statusGreen: '#16A34A',
        statusAmber: '#F59E0B',
        statusRed: '#DC2626',
      },
    },
  },
  plugins: [],
}
