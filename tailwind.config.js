/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
        muted: { DEFAULT: 'rgb(var(--muted-rgb) / <alpha-value>)', foreground: 'rgb(var(--muted-foreground-rgb) / <alpha-value>)' },
        primary: { DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)', foreground: 'rgb(var(--background-rgb) / <alpha-value>)' },
        'brand-blue': 'rgb(var(--brand-blue-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        s1: '#2f6fb5',
        s2: '#d97757',
        s3: '#7a52b3',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
