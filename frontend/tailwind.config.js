/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system','SF Pro Text','Helvetica Neue','sans-serif'],
        mono: ['SF Mono','Menlo','monospace'],
      },
      colors: {
        accent: { DEFAULT: '#0071e3', hover: '#0077ed', light: '#e8f1fb' },
        dark: { 900:'#000',800:'#1c1c1e',700:'#2c2c2e',600:'#3a3a3c' },
      },
      animation: {
        'fade-up':   'fadeUp .35s cubic-bezier(0.22,1,0.36,1) both',
        'slide-down':'slideDown .22s cubic-bezier(0.22,1,0.36,1) both',
        'spin-slow': 'spin .9s linear infinite',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:    { from:{opacity:0,transform:'translateY(10px)'}, to:{opacity:1,transform:'translateY(0)'} },
        slideDown: { from:{opacity:0,transform:'translateY(-6px)'}, to:{opacity:1,transform:'translateY(0)'} },
        pulseDot:  { '0%,100%':{opacity:1,transform:'scale(1)'},'50%':{opacity:.4,transform:'scale(.8)'} },
      },
    },
  },
  plugins: [],
}
