import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WagmiConfig } from 'wagmi';
import { config } from '@/lib/wagmi';
import { Footer } from '@/components/layouts/Footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Token Factory',
  description: 'Create and manage tokens with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-screen bg-gray-900">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <WagmiConfig config={config}>
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </WagmiConfig>
      </body>
    </html>
  );
} 