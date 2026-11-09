import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-pjs)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        panel: "var(--panel)",
        "white-btn": "var(--white-btn)",
        "btn-ink": "var(--btn-ink)",
      },
      transitionTimingFunction: {
        reveal: "cubic-bezier(0.16, 1, 0.3, 1)",
        soft: "cubic-bezier(0.25, 0.8, 0.3, 1)",
      },
      keyframes: {
        lineRise: {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        subIn: {
          from: {
            opacity: "0",
            transform: "translateY(calc(14 * var(--u)))",
            filter: "blur(4px)",
          },
          to: {
            opacity: "1",
            transform: "none",
            filter: "blur(0)",
          },
        },
        subInFlat: {
          from: {
            opacity: "0",
            transform: "translateY(calc(12 * var(--u)))",
          },
          to: {
            opacity: "1",
            transform: "none",
          },
        },
        pillIn: {
          from: {
            opacity: "0",
            transform: "translateY(calc(8 * var(--u))) scale(0.972)",
          },
          to: {
            opacity: "1",
            transform: "none",
          },
        },
        liftIn: {
          from: {
            opacity: "0",
            transform: "translateY(calc(9 * var(--u)))",
          },
          to: {
            opacity: "1",
            transform: "none",
          },
        },
        logoIn: {
          from: {
            opacity: "0",
            transform:
              "translateY(calc(-2.4 * var(--u))) translateY(calc(9 * var(--u)))",
          },
          to: {
            opacity: "1",
            transform: "translateY(calc(-2.4 * var(--u)))",
          },
        },
        menuIn: {
          from: {
            opacity: "0",
            transform: "translateY(-6px) scale(0.985)",
          },
          to: {
            opacity: "1",
            transform: "none",
          },
        },
      },
      animation: {
        lineRise: "lineRise 1.05s cubic-bezier(0.16, 1, 0.3, 1) both",
        subIn: "subIn 0.85s cubic-bezier(0.16, 1, 0.3, 1) both",
        subInFlat: "subInFlat 0.85s cubic-bezier(0.16, 1, 0.3, 1) both",
        pillIn: "pillIn 0.55s cubic-bezier(0.25, 0.8, 0.3, 1) both",
        pillInCta: "pillIn 0.70s cubic-bezier(0.16, 1, 0.3, 1) both",
        liftIn: "liftIn 0.55s cubic-bezier(0.25, 0.8, 0.3, 1) both",
        logoIn: "logoIn 0.62s cubic-bezier(0.25, 0.8, 0.3, 1) both",
        menuIn: "menuIn 0.18s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
