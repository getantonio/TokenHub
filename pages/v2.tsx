import { Header } from '../components/Header';
import { TokenFormV2 } from '../components/TokenFormV2';
import TokenAdminV2 from '../components/TokenAdminV2';
import { useNetwork } from '../contexts/NetworkContext';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';

export default function V2Page() {
  const { isSupported } = useNetwork();
  const { isConnected, address } = useWallet();

  return (
    <div className="min-h-screen bg-background">
      <Head>
        <title>Token Factory v2 - Presale Token Creation</title>
        <meta name="description" content="Create and manage tokens with presale functionality using Token Factory v2" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      <main className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {!isSupported ? (
            <div className="card p-3">
              <p className="text-text-secondary">Please connect to a supported network to create tokens.</p>
            </div>
          ) : (
            <>
              <TokenFormV2 isConnected={isConnected} />
              <TokenAdminV2 isConnected={isConnected} address={address} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}