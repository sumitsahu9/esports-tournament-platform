import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import AnnouncementBanner from '@/components/announcement-banner';
import WhatsappSupport from '@/components/whatsapp-support';

const outfit = { variable: 'font-outfit' };
const inter = { variable: 'font-inter' };

export const metadata: Metadata = {
  metadataBase: new URL('https://masharena.com'),
  title: {
    default: 'Mash Arena | Play BGMI & Free Fire Tournaments | Win Real Cash',
    template: '%s | Mash Arena'
  },
  description: 'Join Mash Arena, the leading online tournament platform. Register for daily BGMI and Free Fire matches, showcase your skill, and win real cash payouts directly to your UPI wallet.',
  verification: {
    google: 'googlec817a7e72e93722d',
  },
  keywords: [
    'masharena', 'mash arena', 'Mash arena', 'Mash Arena', 'Mash Arena Esports', 'Mash Arena Tournaments',
    'BGMI Tournaments', 'Free Fire Tournaments', 'Play BGMI Win Cash', 'Free Fire Win Money', 
    'Esports India', 'Gaming Tournament App', 'BGMI Custom Rooms',
    'Play and Win Cash Games', 'Indian Esports Platform', 'Online Gaming Earn Money',
    'Free Fire Custom Room match', 'BGMI Daily Tournaments', 'Esports Tournament Platform'
  ],
  authors: [{ name: 'Mash Arena Esports Team' }],
  creator: 'Mash Arena',
  publisher: 'Mash Arena',
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
    url: 'https://masharena.com',
    title: 'Mash Arena | Play BGMI & Free Fire Tournaments | Win Real Cash',
    description: 'Join Mash Arena, the leading online tournament platform. Register for daily BGMI and Free Fire matches, showcase your skill, and win real cash payouts directly to your UPI wallet.',
    siteName: 'Mash Arena',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mash Arena | BGMI & Free Fire Tournament Arena',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mash Arena | Play BGMI & Free Fire Tournaments | Win Real Cash',
    description: 'Join Mash Arena, the leading online tournament platform. Register for daily BGMI and Free Fire matches, showcase your skill, and win real cash payouts directly to your UPI wallet.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://masharena.com',
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
          <WhatsappSupport />
        </AuthProvider>
      </body>
    </html>
  );
}
