import type { Metadata, Viewport } from 'next';
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
      <body className="bg-[#000000] text-white min-h-screen overflow-hidden select-none touch-manipulation">
        {children}
      </body>
    </html>
  );
}
