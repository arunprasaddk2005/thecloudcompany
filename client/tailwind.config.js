/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F1F4F0',
        ink: '#15231F',
        pine: { DEFAULT: '#1E5B52', deep: '#143F39' },
        mint: '#D3E5DD',
        amber: { DEFAULT: '#E8A33D', soft: '#FBEBCF' },
        brick: { DEFAULT: '#B63A2B', soft: '#F7DDD8' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
