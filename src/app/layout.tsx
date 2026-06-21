import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import AnnouncementBanner from '@/components/announcement-banner';

const outfit = { variable: 'font-outfit' };
const inter = { variable: 'font-inter' };

export const metadata: Metadata = {
  title: 'Vortex Esports - Play BGMI & Free Fire Tournaments',
  description: 'Join paid esports tournaments for BGMI and Free Fire. Play matches, show your skill, and win real cash payouts daily on the premium gaming platform.',
  keywords: 'BGMI, Free Fire, Esports tournaments, play and win, game tournaments, real cash prizes, gaming wallet',
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
