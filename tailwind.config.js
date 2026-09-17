/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wa: {
          green: '#25D366',
          teal: '#075E54',
          tealLight: '#128C7E',
          out: '#D9FDD3',
          outDark: '#005C4B',
          text: '#111B21',
          sub: '#667781',
          divider: '#E9EDEF',
          bg: '#EFEAE2',
          panel: '#FFFFFF',
          header: '#F0F2F5',
          // dark
          dbg: '#0B141A',
          dpanel: '#111B21',
          dheader: '#202C33',
          din: '#2A3942',
          dtext: '#E9EDEF',
          dsub: '#8696A0',
          ddivider: '#222D34',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(0.8)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        ring: { '0%,100%': { transform: 'rotate(0)' }, '25%': { transform: 'rotate(12deg)' }, '75%': { transform: 'rotate(-12deg)' } },
        slideUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
      },
      animation: {
        pop: 'pop .12s ease-out',
        ring: 'ring 1s ease-in-out infinite',
        slideUp: 'slideUp .18s ease-out',
      },
    },
  },
  plugins: [],
}
