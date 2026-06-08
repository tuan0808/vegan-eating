// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        green: "var(--terra)",
        carrot: "var(--carrot)",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Hanken Grotesk", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;