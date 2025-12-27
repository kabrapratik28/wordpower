/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./entrypoints/**/*.{html,js,ts,jsx,tsx}", // Scan all files in entrypoints
    "./popup/**/*.{html,js,ts,jsx,tsx}", // Ensure popup is also scanned
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}