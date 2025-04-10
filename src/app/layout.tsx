import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Footer } from '@/components/layouts/Footer';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Token Factory',
  description: 'Create and manage tokens with ease',
};

// Client-side only wrapper
function ClientSideLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-screen bg-gray-900">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
} 