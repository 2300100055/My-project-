/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Strict 3-color Apple palette: White (#FFFFFF), Ink (#1D1D1F / #6E6E73), Apple Blue (#0071E3)
        canvas: "#FFFFFF",
        surface: "#F5F5F7",
        "text-primary": "#1D1D1F",
        "text-secondary": "#6E6E73",
        accent: "#0071E3",
        "accent-hover": "#0077ED",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "22px",
        "card-lg": "28px",
        input: "12px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.06), 0 16px 36px rgba(0, 0, 0, 0.06)",
        nav: "0 1px 0 rgba(0, 0, 0, 0.06)",
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
