/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#0a0c0b",
        graphite: "#15181a",
        panel: "#1c2124",
        lime: {
          DEFAULT: "#a3e635",
          glow: "#bef264",
        },
        royal: "#d4af37",
        royalbright: "#f0cd6a",
      },
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
