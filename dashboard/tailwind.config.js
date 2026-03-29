/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js,tsx,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f3f6fb',
        panel: '#ffffff',
        line: '#d9e3f3',
        ink: '#10243d',
        muted: '#5f728a',
        accent: '#0f5bff',
        success: '#1d9d5f',
        warning: '#d89a00',
        danger: '#d43f52',
      },
      fontFamily: {
        heading: ['"Sora"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 24px rgba(16, 36, 61, 0.08)',
      },
      borderRadius: {
        card: '1rem',
      },
    },
  },
  plugins: [],
}
