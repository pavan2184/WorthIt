import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        worth: {
          brand: "#00A86B",
          "brand-hover": "#00945F",
          accent: "#FF6B35",
          "accent-hover": "#E65F2F",
          charcoal: "#171717",
          gold: "#C8A64B",
          ink: "#101828",
          muted: "#64748B",
          page: "#F4F6F8",
          surface: "#FFFFFF",
          border: "#E2E8F0",
          "brand-soft": "#E6F8F1",
          "accent-soft": "#FFF0EA",
        },
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
