import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#080B14',
          secondary: '#0D1117',
          card: '#111520',
          border: '#1C2333',
        },
        accent: {
          blue: '#4F8EF7',
          purple: '#8B5CF6',
        },
        state: {
          allowed: '#00E5A0',
          risky: '#F59E0B',
          blocked: '#FF3B6B',
          trending: '#00E5A0',
          sideways: '#F59E0B',
          trap: '#FF3B6B',
        },
        text: {
          primary: '#E6EDF3',
          secondary: '#7D8590',
          muted: '#3D444D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 40px currentColor' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-gradient': 'linear-gradient(135deg, #111520 0%, #0D1117 100%)',
      },
    },
  },
  plugins: [],
}

export default config
