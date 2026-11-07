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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* OBSION / AI-RULES v3: High-impact display font Unbounded + Oswald, clean body font Golos Text */}
        <link
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;600;700;800&family=Oswald:wght@500;700&family=Unbounded:wght@400;600;700;900&display=swap"
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
      <body className="bg-[#000000] text-white min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
