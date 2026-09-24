import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#141413",
        "ink-soft": "#6b6a67",
        bg: "#faf9f5",
        accent: "#2f6f63",
        border: "#e5e2da",
      },
    },
  },
  plugins: [],
};
export default config;
