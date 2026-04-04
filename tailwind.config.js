/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        farcaster: '#7c3aed',
        'farcaster-light': '#a78bfa',
        'farcaster-dark': '#4c1d95',
        pixel: '#f5d020',
        'bg-primary': '#0f0a1e',
        'bg-secondary': '#1a1035',
        'bg-card': '#1e1540',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
