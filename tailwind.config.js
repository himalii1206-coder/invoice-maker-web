/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
      colors: {
        warm: {
          bg: '#f7f4ef',
          surface: '#ffffff',
          input: '#f0ebe1',
          border: '#e6dfd5',
          borderLight: '#f3ede5',
          text: '#2b180d',
          textMuted: '#6b5a4e',
          textSubtle: '#948375',
          accent: '#7c4a27',
          accentHover: '#5c3519',
          accentLight: '#f3ede4',
          accentSubtle: '#eae0d2'
        },
        status: {
          paidBg: '#ecfdf5',
          paidText: '#047857',
          pendingBg: '#fffbe6',
          pendingText: '#b45309',
          draftBg: '#f3f4f6',
          draftText: '#4b5563',
          overdueBg: '#fef2f2',
          overdueText: '#b91c1c'
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        warm: '0 1px 3px 0 rgba(43, 24, 13, 0.04), 0 1px 2px 0 rgba(43, 24, 13, 0.02)',
        warmMd: '0 4px 6px -1px rgba(43, 24, 13, 0.06), 0 2px 4px -1px rgba(43, 24, 13, 0.03)',
        warmLg: '0 10px 15px -3px rgba(43, 24, 13, 0.08), 0 4px 6px -2px rgba(43, 24, 13, 0.04)',
      }
    },
  },
  plugins: [],
}
