import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import AnnouncementBanner from '@/components/announcement-banner';

const outfit = { variable: 'font-outfit' };
const inter = { variable: 'font-inter' };

export const metadata: Metadata = {
  metadataBase: new URL('https://vortexesports.com'),
  title: {
    default: 'Vortex Esports | Play BGMI & Free Fire Tournaments | Win Real Cash',
    template: '%s | Vortex Esports'
  },
  description: 'Join Vortex Esports, the leading online tournament platform. Register for daily BGMI and Free Fire matches, showcase your skill, and win real cash payouts directly to your UPI wallet.',
  keywords: [
    'BGMI Tournaments', 'Free Fire Tournaments', 'Play BGMI Win Cash', 'Free Fire Win Money', 
    'Esports India', 'Gaming Tournament App', 'BGMI Custom Rooms', 'Vortex Esports Tournaments',
    'Play and Win Cash Games', 'Indian Esports Platform', 'Online Gaming Earn Money',
    'Free Fire Custom Room match', 'BGMI Daily Tournaments', 'Esports Tournament Platform'
  ],
  authors: [{ name: 'Vortex Esports Team' }],
  creator: 'Vortex Esports',
  publisher: 'Vortex Esports',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://vortexesports.com',
    title: 'Vortex Esports | Play BGMI & Free Fire Tournaments | Win Real Cash',
    description: 'Join Vortex Esports, the leading online tournament platform. Register for daily BGMI and Free Fire matches, showcase your skill, and win real cash payouts directly to your UPI wallet.',
    siteName: 'Vortex Esports',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vortex Esports | BGMI & Free Fire Tournament Arena',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vortex Esports | Play BGMI & Free Fire Tournaments | Win Real Cash',
    description: 'Join Vortex Esports, the leading online tournament platform. Register for daily BGMI and Free Fire matches, showcase your skill, and win real cash payouts directly to your UPI wallet.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://vortexesports.com',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col antialiased premium-cyber-bg">
        <AuthProvider>
          <AnnouncementBanner />
          <Navbar />
          <main className="flex-grow flex flex-col">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
