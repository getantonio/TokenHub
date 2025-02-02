import { Header } from './Header';
import { MainNavigation } from './MainNavigation';
import Head from 'next/head';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function Layout({ children, title = 'TokenHub.dev', description = 'Create and manage your tokens' }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="sticky top-0 z-50">
        <Header />
        <MainNavigation />
      </div>

      {children}
    </div>
  );
} 