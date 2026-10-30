/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'Segoe UI', 'sans-serif']
      },
      colors: {
        mmz: {
          bg: '#0b0b0d',
          surface: '#16161a',
          elevated: '#1e1e23',
          line: '#2a2a31',
          red: '#e60000',
          orange: '#ff6a00',
          amber: '#ff9a00'
        }
      },
      backgroundImage: {
        'mmz-accent': 'linear-gradient(90deg, #e60000 0%, #ff6a00 60%, #ff9a00 100%)'
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(255, 106, 0, 0.85), 0 12px 40px rgba(230, 0, 0, 0.35)',
        card: '0 10px 30px rgba(0, 0, 0, 0.55)'
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out'
      }
    }
  },
  plugins: []
}
