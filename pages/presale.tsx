import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useNetwork } from '../contexts/NetworkContext';
import { getNetworkContractAddress } from '../config/contracts';
import TokenFactory_v2 from '../contracts/abi/TokenFactory_v2.1.0.json';
import { ethers } from 'ethers';

interface PresaleToken {
  address: string;
  name: string;
  symbol: string;
  softCap: string;
  hardCap: string;
  presaleRate: string;
  startTime: number;
  endTime: number;
  totalContributed: string;
  isWhitelistEnabled: boolean;
  status: 'pending' | 'active' | 'ended';
}

export default function PresalePage() {
  const { chainId, isSupported } = useNetwork();
  const [presaleTokens, setPresaleTokens] = useState<PresaleToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPresaleTokens();
  }, [chainId]);

  async function loadPresaleTokens() {
    if (!chainId || !isSupported) {
      setPresaleTokens([]);
      setLoading(false);
      return;
    }

    try {
      // This would be replaced with actual contract calls
      const mockTokens: PresaleToken[] = [
        {
          address: '0x...',
          name: 'Test Token',
          symbol: 'TEST',
          softCap: '100',
          hardCap: '1000',
          presaleRate: '1000',
          startTime: Date.now() / 1000 + 3600,
          endTime: Date.now() / 1000 + 86400,
          totalContributed: '50',
          isWhitelistEnabled: true,
          status: 'pending'
        },
        // Add more mock tokens for testing
      ];

      setPresaleTokens(mockTokens);
    } catch (error) {
      console.error('Error loading presale tokens:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'pending':
        return 'status-pending';
      case 'ended':
        return 'status-ended';
      default:
        return '';
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Presale Marketplace</h1>
        
        {!isSupported ? (
          <div className="card">
            <p className="text-text-secondary">Please connect to a supported network to view presale tokens.</p>
          </div>
        ) : loading ? (
          <div className="card">
            <p className="text-text-secondary">Loading presale tokens...</p>
          </div>
        ) : presaleTokens.length === 0 ? (
          <div className="card">
            <p className="text-text-secondary">No presale tokens found.</p>
          </div>
        ) : (
          <div className="marketplace-grid">
            {presaleTokens.map((token) => (
              <div key={token.address} className="presale-card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">{token.name}</h3>
                    <p className="text-text-secondary">{token.symbol}</p>
                  </div>
                  <span className={`status-badge ${getStatusBadgeClass(token.status)}`}>
                    {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-text-secondary">
                    Soft Cap: <span className="text-text-primary">{token.softCap} ETH</span>
                  </p>
                  <p className="text-text-secondary">
                    Hard Cap: <span className="text-text-primary">{token.hardCap} ETH</span>
                  </p>
                  <p className="text-text-secondary">
                    Rate: <span className="text-text-primary">{token.presaleRate} tokens per ETH</span>
                  </p>
                  <p className="text-text-secondary">
                    Progress: <span className="text-text-primary">{token.totalContributed} ETH</span>
                  </p>
                  {token.isWhitelistEnabled && (
                    <p className="text-yellow-500">Whitelist enabled</p>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <button className="btn btn-primary">
                    View Details
                  </button>
                  <button className="btn btn-secondary">
                    Contribute
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 