import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        void: "#070707",
        panel: "#10100f",
        cream: "#f4f0e8",
        stone: "#c6b896",
        olive: "#8fbf9a",
        amber: "#caa76a",
        rust: "#c57f73",
        ink: {
          950: "#0b0d10",
          900: "#11151b",
          850: "#151a21",
          800: "#1b222b",
          700: "#27313d",
          600: "#364352"
        },
        mist: {
          50: "#f7f8f8",
          100: "#ecefed",
          200: "#d7ddd8",
          300: "#b7c1ba",
          400: "#8f9e94"
        },
        signal: {
          green: "#65d68b",
          amber: "#e9b949",
          red: "#f97066",
          blue: "#7da7ff"
        }
      },
      boxShadow: {
        soft: "0 28px 90px rgba(0, 0, 0, 0.34)",
        line: "inset 0 1px 0 rgba(255, 255, 255, 0.055)"
      },
      fontFamily: {
        sans: [
          "Manrope",
          "Inter",
          "Geist Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
