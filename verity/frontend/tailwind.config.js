/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Strict 3-color system: Pure White (#FFFFFF), Ink (#1D1D1F), Apple Blue (#0071E3)
        canvas: "#FFFFFF",
        surface: "#FFFFFF",
        "text-primary": "#1D1D1F",
        "text-secondary": "#1D1D1F",
        accent: "#0071E3",
        "accent-hover": "#0071E3",
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
        card: "20px",
        "card-lg": "26px",
        input: "12px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(29, 29, 31, 0.06), 0 8px 24px rgba(29, 29, 31, 0.04)",
        "card-hover": "0 4px 14px rgba(0, 113, 227, 0.12), 0 12px 32px rgba(29, 29, 31, 0.06)",
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
