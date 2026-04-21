/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        tvbs: {
          red: '#E30613',
          dark: '#1a1a1a',
          gray: '#666666',
        },
      },
    },
  },
  plugins: [],
};
