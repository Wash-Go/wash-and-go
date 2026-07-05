import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#CA6E27",
          "orange-light": "#FFA662",
          peach: "#FFD4B3",
          "sky-light": "#B1D9EE",
          "steel-blue": "#6595BD",
          navy: "#2D3E4D",
          slate: "#33414E",
          gray: "#B9BCC0",
          "off-white": "#FAFAFA",
        },
      },
      fontFamily: {
        heading: ["var(--font-poppins)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        pill: "9999px",
      },
      boxShadow: {
        card: "0 4px 24px rgba(45, 62, 77, 0.08)",
        cta: "0 8px 32px rgba(202, 110, 39, 0.25)",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #FFD4B3 0%, #FAFAFA 60%, #B1D9EE 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
