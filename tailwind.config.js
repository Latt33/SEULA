/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
        muted: { DEFAULT: 'rgb(var(--muted-rgb) / <alpha-value>)', foreground: 'rgb(var(--muted-foreground-rgb) / <alpha-value>)' },
        primary: { DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)', foreground: 'rgb(255 255 255 / <alpha-value>)' },
        deep: 'rgb(var(--deep-rgb) / <alpha-value>)',
        sage: 'rgb(var(--sage-rgb) / <alpha-value>)',
        cream: 'rgb(var(--cream-rgb) / <alpha-value>)',
        mist: 'rgb(var(--mist-rgb) / <alpha-value>)',
        'brand-blue': 'rgb(var(--brand-blue-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        s1: '#3d79b8',
        s2: '#c4843f',
        s3: '#1f8a62',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '2.5rem' },
    },
  },
  plugins: [],
};
