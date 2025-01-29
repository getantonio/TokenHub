import type { MetaMaskInpageProvider } from '@metamask/providers';
import TokenForm_v1 from '../components/TokenForm_v1';
import TokenAdmin from '../components/TokenAdmin';
import { useNetwork } from '../contexts/NetworkContext';
import { useWallet } from '../contexts/WalletContext';
import Head from 'next/head';
import { Header } from '../components/Header';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

export default function V1Page() {
  const { isConnected, address } = useWallet();
  const { isSupported } = useNetwork();

  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>Token Factory v1 - Basic Token Creation</title>
        <meta name="description" content="Create and manage basic ERC20 tokens with Token Factory v1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {!isSupported ? (
            <div className="card mb-8">
              <p className="text-text-secondary">
                Please connect to a supported network to deploy your token.
                You can still view and configure the token settings below.
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <TokenForm_v1 isConnected={isConnected} />
          </div>

          {isConnected && (
            <div className="mt-8">
              <TokenAdmin isConnected={isConnected} address={address} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}