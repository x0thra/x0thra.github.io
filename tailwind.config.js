/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'terminal-black': '#050505',
        'terminal-dark': '#0a0a0a',
        'terminal-purple': '#333344', /* Very muted, cold, almost gray-purple */
        'terminal-purple-light': '#666677',
        'glass-bg': 'rgba(10, 10, 10, 0.4)',
        'glass-border': 'rgba(255, 255, 255, 0.05)',
        'glass-border-hover': 'rgba(255, 255, 255, 0.15)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 4px 24px -1px rgba(0, 0, 0, 0.8)',
      }
    },
  },
  plugins: [],
}
