import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Calorie-to-Route Runner — Умный генератор беговых маршрутов',
  description:
    'Генерация замкнутых кольцевых беговых маршрутов по калориям, весу атлета и текущей погоде через OSRM и Open-Meteo.',
  icons: {
    icon: '/avatar.jpg',
    apple: '/avatar.jpg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CalorieRunner',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#08090C',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="bg-[#08090C] h-full">
      <head>
        <meta name="theme-color" content="#08090C" />
        <meta name="background-color" content="#08090C" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* AI-RULES v3 §3 TYP-02: Pair #1 Oswald 400 (Display) + Golos Text 400 (Body). Exactly 2 weights. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400&family=Oswald:wght@400&display=swap"
          rel="stylesheet"
        />
        {/* Preconnect & DNS-prefetch to speed up critical external APIs & CDN maps */}
        <link rel="preconnect" href="https://hbzoiltldxlbjwskfebw.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://hbzoiltldxlbjwskfebw.supabase.co" />
        <link rel="preconnect" href="https://basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://api.dicebear.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.dicebear.com" />
        <link rel="preconnect" href="https://router.project-osrm.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://router.project-osrm.org" />
        <link rel="preconnect" href="https://api.open-meteo.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.open-meteo.com" />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-[#08090C] text-white h-full w-full overflow-hidden select-none m-0 p-0">
        {children}
      </body>
    </html>
  );
}
