/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Ensure this matches your React components
  ],
  theme: {
    extend: {
      colors: {
        'blue-scrollbar': '#1D4ED8', // Custom blue for scrollbar thumb
      },
      spacing: {
        '1px': '1px', // For thinner scrollbar
      },
    },
  },
  plugins: [],
};
