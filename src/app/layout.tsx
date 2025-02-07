import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WagmiConfig } from 'wagmi';
import { config } from '@/lib/wagmi';
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
    <html lang="en">
      <body className={inter.className}>
        <WagmiConfig config={config}>
          {children}
        </WagmiConfig>
      </body>
    </html>
  );
} 