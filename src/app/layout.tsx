import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Header, Footer } from '@/components';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GT eForms Feature Face Off - Alliance 2026',
  description:
    'Help decide which GT eForms features get built next! Vote in our bracket-style competition at Alliance 2026.',
  keywords: ['bracket', 'voting', 'features', 'GT eForms', 'Alliance 2026'],
  openGraph: {
    title: 'GT eForms Feature Face Off - Alliance 2026',
    description:
      'Help decide which GT eForms features get built next! Vote in our bracket-style competition.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Header />
        <main id="main-content" className="flex-1 container py-8" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
