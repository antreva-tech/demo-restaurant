import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "antreva-navy": "#0B132B",
        "antreva-blue": "#1C6ED5",
        "antreva-slate": "#8A8F98",
        /** Main site: menu palette (dark brown, gold, cream). Admin/POS use antreva only. */
        "menu-brown": "#3D2817",
        "menu-brown-light": "#4A3320",
        "menu-brown-lighter": "#5C3D2E",
        "menu-gold": "#D4AF37",
        "menu-gold-hover": "#B8962E",
        "menu-gold-dark": "#8B7355",
        "menu-cream": "#F5F0E6",
        "menu-cream-muted": "#E8E0D0",
      },
    },
  },
  plugins: [],
};

export default config;
