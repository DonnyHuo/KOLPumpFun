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
        background: {
          DEFAULT: "var(--background)",
          secondary: "var(--background-secondary)",
          card: "var(--background-card)",
          "card-hover": "var(--background-card-hover)",
        },
        card: "var(--background-card)",
        "card-hover": "var(--background-card-hover)",
        foreground: "var(--foreground)",
        secondary: "var(--foreground)",
        muted: "var(--text-muted)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          start: "var(--primary-gradient-start)",
          end: "var(--primary-gradient-end)",
        },
        border: {
          DEFAULT: "var(--border-color)",
          hover: "var(--border-color-hover)",
        },
        hover: "var(--border-color-hover)",
        text: {
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        success: "var(--success)",
        error: "var(--error)",
        warning: "var(--warning)",
        info: "var(--info)",
        glow: {
          primary: "var(--glow-primary)",
          success: "var(--glow-success)",
        },
        tooltip: {
          bg: "var(--tooltip-bg)",
          text: "var(--tooltip-text)",
          border: "var(--tooltip-border)",
          shadow: "var(--tooltip-shadow)",
        },
      },
      fontFamily: {
        poppins: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
