/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#070510',
          darker: '#0D0817',
          card: '#110E20',
          cardBg: 'rgba(18, 18, 30, 0.85)',
          purple: '#7C3AED',
          'purple-hover': '#8B5CF6',
          'purple-light': '#D2BBFF',
          'purple-soft': '#EDE0FF',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.15)',
          text: '#F9F9FF',
          muted: '#958DA1',
          subtle: '#CCC3D8'
        }
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        'purple-glow': '0px 0px 20px 0px rgba(124, 58, 237, 0.35)',
        'purple-glow-lg': '0px 0px 30px 0px rgba(124, 58, 237, 0.5)',
        'card': '0px 20px 40px -10px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
};
