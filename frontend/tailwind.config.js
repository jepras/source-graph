/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        'primary-foreground': "var(--primary-foreground)",
        secondary: "var(--secondary)",
        'secondary-foreground': "var(--secondary-foreground)",
        accent: "var(--accent)",
        'accent-foreground': "var(--accent-foreground)",
        destructive: "var(--destructive)",
        'muted': "var(--muted)",
        'muted-foreground': "var(--muted-foreground)",
        'popover': "var(--popover)",
        'popover-foreground': "var(--popover-foreground)",
        'card': "var(--card)",
        'card-foreground': "var(--card-foreground)",
        'border': "var(--border)",
        'input': "var(--input)",
        'ring': "var(--ring)",
        // Add more as needed from your index.css
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
    },
  },
  plugins: [],
} 