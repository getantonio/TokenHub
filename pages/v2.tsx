import { Header } from '../components/Header';
import { TokenFormV2 } from '../components/TokenFormV2';
import { TokenAdminV2 } from '../components/TokenAdminV2';
import { useNetwork } from '../contexts/NetworkContext';
import { useWallet } from '../contexts/WalletContext';

export default function V2Page() {
  const { isSupported } = useNetwork();
  const { isConnected } = useWallet();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {!isSupported ? (
          <div className="card">
            <p className="text-text-secondary">Please connect to a supported network to create tokens.</p>
          </div>
        ) : (
          <>
            <TokenFormV2 isConnected={isConnected} />
            <TokenAdminV2 isConnected={isConnected} />
          </>
        )}
      </main>
    </div>
  );
} 