/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // SDD: "Every page has a light and a dark mode." Tailwind's built-in dark
  // variant, toggled by a class on <html> so the user's choice can be saved.
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
