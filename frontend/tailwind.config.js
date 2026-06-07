/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        bmod: {
          black: "#0A0A0A",
          white: "#FFFFFF",
          accent: "#E4002B",
          gray: {
            100: "#F7F7F8",
            200: "#E5E5E5",
            400: "#9CA3AF",
            700: "#374151",
          },
        },
      },
      fontFamily: {
        sans: ["Helvetica Neue", "Arial", "system-ui", "sans-serif"],
        display: ["Helvetica Neue", "Arial", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
