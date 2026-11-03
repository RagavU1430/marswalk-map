import { join } from 'path'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Martian planet palette
        'mars-surface': '#D2691E',   // Mars dirt red
        'mars-dust': '#A0522D',       // Dusty terrain
        'mars-shadow': '#2C1810',     // Deep shadows
        'mars-ice': '#C0C0C0',        // Ice deposits
        'radiation-low': '#4CAF50',   // Green - safe
        'radiation-med': '#FFC107',   // Yellow - caution
        'radiation-high': '#F44336',  // Red - danger
        'hud-danger': '#FF5722',      // Hazard warning
        'hud-safe': '#2196F3',         // Safe zone
        'opace': '#0D0D0D',          // Spacesuit black
        'plasma': '#FF0000',          // Plasma effect
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Source Code Pro', 'monospace'],
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'pulse-red': 'pulse-red 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}