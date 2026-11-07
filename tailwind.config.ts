import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Unbounded', 'Oswald', 'sans-serif'],
        body: ['"Golos Text"', '-apple-system', 'sans-serif'],
      },
      colors: {
        rush: {
          black: '#000000',
          carbon: '#08090C',
          surface: '#0F1118',
          card: '#12151F',
          border: 'rgba(255, 255, 255, 0.1)',
          violet: '#7D39EB',
          'violet-glow': '#9D5BFF',
          lime: '#C6FF33',
          'lime-hover': '#D4FF55',
          white: '#FFFFFF',
          cream: '#F4F4F6',
          dark: '#0A0A0A',
        },
        turf: {
          dark: '#08090C',
          surface: '#0F1118',
          card: '#151924',
          border: '#242A38',
          accent: '#3B82F6',
          danger: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
        },
      },
      boxShadow: {
        'neon-lime': '0 0 20px rgba(198, 255, 51, 0.35)',
        'neon-violet': '0 0 25px rgba(125, 57, 235, 0.45)',
        'cyber-card': '0 12px 40px 0 rgba(0, 0, 0, 0.85)',
      },
      transitionTimingFunction: {
        signature: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
export default config;
