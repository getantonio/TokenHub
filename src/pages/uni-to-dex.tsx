import { ListToken } from '@/components/features/token/ListToken';
import { Footer } from '@/components/layouts/Footer';
import Head from 'next/head';

export default function UniToDexPage() {
  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>Uni To DEX - TokenHub.dev</title>
        <meta name="description" content="List your token on DEX with TokenHub.dev" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">List Token on DEX</h1>
          <p className="text-gray-400 mb-8">
            List your token on a decentralized exchange (DEX) with automatic liquidity provision.
          </p>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
            <ListToken />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 