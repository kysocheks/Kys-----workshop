import type { Metadata, Viewport } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KySочек Workshop',
  description:
    'Мастерская: интерфейсы, интерактивная графика и игры. Сайты, Яндекс Игры, Steam.',
};

export const viewport: Viewport = {
  themeColor: '#08080A',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${interTight.variable} ${jetbrains.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          К содержимому
        </a>
        {children}
      </body>
    </html>
  );
}
