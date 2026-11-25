/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Apple design tokens
        surface: "#F5F5F7",
        "text-primary": "#1D1D1F",
        "text-secondary": "#6E6E73",
        accent: "#0071E3",
        "accent-hover": "#0077ED",
        "verdict-authentic": "#34C759",
        "verdict-inconclusive": "#FF9F0A",
        "verdict-ai": "#FF3B30",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "SF Pro Display",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "20px",
        "card-lg": "28px",
        input: "12px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 2px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        nav: "0 1px 0 rgba(0,0,0,0.08)",
      },
      animation: {
        "spin-slow": "spin 2s linear infinite",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-up": "fade-up 0.4s ease-out forwards",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
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
