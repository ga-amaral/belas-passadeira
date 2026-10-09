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
        brand: {
          bg: "#F8F2FA",
          card: "#FFFFFF",
          text: "#6B3267",
          gold: "#A359A0",
          "gold-light": "#C197D2",
          "gold-dark": "#6B3267",
          rose: "#F652A0",
          "rose-light": "#FA86BD",
          mint: "#7D9B76",
          "mint-light": "#9AB893",
        },
      },
      fontFamily: {
        poppins: ["var(--font-poppins)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        gold: "0 4px 24px 0 rgba(163,89,160,0.10)",
        "gold-md": "0 8px 32px 0 rgba(163,89,160,0.18)",
        "gold-lg": "0 16px 48px 0 rgba(163,89,160,0.22)",
        card: "0 2px 16px 0 rgba(107,50,103,0.07)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "spin-slow": "spin 2s linear infinite",
        "thread-pull": "threadPull 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        threadPull: {
          "0%, 100%": { strokeDashoffset: "100" },
          "50%": { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
