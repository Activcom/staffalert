import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "slide-in-top": {
          "0%": { transform: "translateY(-120%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-urgent": {
          "0%, 100%": { backgroundColor: "rgb(185 28 28)" },
          "50%": { backgroundColor: "rgb(127 29 29)" },
        },
      },
      animation: {
        "slide-in-top": "slide-in-top 0.5s ease-out forwards",
        "pulse-urgent": "pulse-urgent 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
