import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rush: {
          black: '#000000',
          violet: '#7D39EB',
          lime: '#C6FF33',
          white: '#FFFFFF',
          dark: '#0A0A0A',
          card: '#121212',
          border: '#242424',
        },
        turf: {
          dark: '#0B0F17',
          surface: '#111827',
          card: '#1F2937',
          border: '#374151',
          accent: '#3B82F6',
          danger: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
export default config;
