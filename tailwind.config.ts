import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f5f3",
          100: "#e8e5df",
          700: "#3f3a33",
          800: "#2a2620",
          900: "#1c1915",
        },
        gold: {
          400: "#c9a24a",
          500: "#b58a2e",
          600: "#9a7322",
        },
      },
      fontFamily: {
        serif: ["Georgia", "'Nanum Myeongjo'", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
