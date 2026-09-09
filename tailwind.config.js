
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mt: {
          blue: '#0066ff',
          blueDark: '#0047b3',
          blueDeep: '#00285f',
          blueSoft: '#e8f0ff',
          blueTint: '#f3f7ff',
          ink: '#0b0d12',
          graphite: '#1b1f27'
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#f8fafc',
          border: '#e6ebf1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif']
      },
      keyframes: {
        sacudir: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%,60%': { transform: 'translateX(-7px)' },
          '40%,80%': { transform: 'translateX(7px)' }
        }
      },
      animation: {
        sacudir: 'sacudir 0.4s ease-in-out'
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(148, 163, 184, 0.12), 0 2px 6px -1px rgba(148, 163, 184, 0.07)',
        soft: '0 8px 30px rgba(0, 102, 255, 0.06)',
        blue: '0 10px 26px -6px rgba(0, 102, 255, 0.35)'
      }
    }
  },
  plugins: []
}
