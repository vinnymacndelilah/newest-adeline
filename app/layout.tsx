import type { Metadata, Viewport } from 'next';
import { Emilys_Candy, Kalam, Nunito, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const emilysCandy = Emilys_Candy({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-emilys-candy',
  display: 'swap',
});

const kalam = Kalam({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-kalam',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dear Adeline Academy — Education as Unique as Your Child',
  description:
    'Personal enough to follow their wonder. Structured enough to help them graduate. A family homeschool learning companion, interactive classroom, registrar, portfolio, and living library.',
  icons: {
    icon: '/adeline-nav.png',
    apple: '/adeline-nav.png',
  },
  openGraph: {
    title: 'Dear Adeline Academy — Education as Unique as Your Child',
    description:
      'Personal enough to follow their wonder. Structured enough to help them graduate.',
    type: 'website',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dear Adeline Academy',
    description:
      'Personal enough to follow their wonder. Structured enough to help them graduate.',
    images: ['/og-image.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#fbf5ea',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${emilysCandy.variable} ${kalam.variable} ${nunito.variable} ${ibmMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen antialiased selection:bg-[#7c9a61]/25 selection:text-[#303734]"
      >
        {children}
      </body>
    </html>
  );
}
