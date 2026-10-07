/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A', surface: '#131315', raised: '#1B1B1E', line: '#2A2A2E',
        gold: '#D4AF6A', goldhi: '#E8C989', bronze: '#8A6E3D',
        cream: '#F5F1E8', dim: '#B3ADA3', faint: '#8A847B', wa: '#25D366',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
