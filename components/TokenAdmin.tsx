import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import TokenFactory from '../artifacts/contracts/TokenFactory_v1.sol/TokenFactory_v1.json';
import TokenTemplate from '../artifacts/contracts/TokenTemplate_v1.sol/TokenTemplate_v1.json';
import { getNetworkContractAddress } from '../config/contracts';
import { Toast } from './ui/Toast';
import { Spinner } from './ui/Spinner';

const TOKEN_DECIMALS = 18; // Standard ERC20 decimals

interface TokenAdminProps {
  isConnected: boolean;
  address?: string;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  blacklistEnabled: boolean;
  timeLockEnabled: boolean;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

export default function TokenAdmin({ isConnected, address }: TokenAdminProps) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [blacklistAddress, setBlacklistAddress] = useState('');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadTokens = async () => {
    if (!isConnected || !window.ethereum) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddress');
      
      const factory = new Contract(factoryAddress, TokenFactory.abi, signer);
      const userAddress = address || await signer.getAddress();
      const deployedTokens = await factory.getTokensByUser(userAddress);
      
      const tokenInfoPromises = deployedTokens.map(async (tokenAddress: string) => {
        const token = new Contract(tokenAddress, TokenTemplate.abi, signer);
        const [name, symbol, totalSupply, blacklistEnabled, timeLockEnabled] = await Promise.all([
          token.name(),
          token.symbol(),
          token.totalSupply(),
          token.blacklistEnabled(),
          token.timeLockEnabled()
        ]);

        return {
          address: tokenAddress,
          name,
          symbol,
          totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
          blacklistEnabled,
          timeLockEnabled
        };
      });

      const tokenInfos = await Promise.all(tokenInfoPromises);
      setTokens(tokenInfos);
    } catch (error: any) {
      console.error('Error loading tokens:', error);
      showToast('error', error.message || 'Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlacklist = async (tokenAddress: string, addressToBlacklist: string, blacklist: boolean) => {
    if (!isConnected || !window.ethereum) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplate.abi, signer);

      const tx = await token[blacklist ? 'blacklist' : 'unblacklist'](addressToBlacklist);
      showToast('success', 'Transaction submitted...');
      
      await tx.wait();
      showToast('success', `Address ${blacklist ? 'blacklisted' : 'unblacklisted'} successfully`);
      setBlacklistAddress('');
    } catch (error: any) {
      console.error('Error managing blacklist:', error);
      showToast('error', error.message || 'Failed to manage blacklist');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadTokens();
    }
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="p-6 bg-background-accent rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-6 text-text-primary">Token Management</h2>
        <p className="text-text-secondary">Please connect your wallet to manage tokens.</p>
      </div>
    );
  }

  return (
    <div className="p-6 relative bg-background-accent rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-6 text-text-primary">Token Management</h2>
      
      {toast && <Toast type={toast.type} message={toast.message} />}
      
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Spinner className="w-8 h-8 text-text-primary" />
        </div>
      ) : tokens.length === 0 ? (
        <p className="text-text-secondary">No tokens found. Deploy a new token to get started.</p>
      ) : (
        <div className="space-y-6">
          {tokens.map(token => (
            <div key={token.address} className="border border-border rounded-lg p-4 space-y-4 bg-background-secondary">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-text-primary">{token.name} ({token.symbol})</h3>
                  <p className="text-sm text-text-secondary">Address: {token.address}</p>
                  <p className="text-sm text-text-secondary">Total Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                </div>
                <button
                  onClick={() => setSelectedToken(selectedToken === token.address ? null : token.address)}
                  className="text-text-accent hover:text-blue-400"
                >
                  {selectedToken === token.address ? 'Hide' : 'Manage'}
                </button>
              </div>

              {selectedToken === token.address && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex gap-2 mb-4">
                    <a
                      href={`https://sepolia.etherscan.io/token/${token.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-accent hover:text-blue-400"
                    >
                      View on Etherscan ↗
                    </a>
                  </div>

                  {!token.blacklistEnabled && !token.timeLockEnabled ? (
                    <p className="text-text-secondary italic">This token was created without blacklist or timelock features.</p>
                  ) : (
                    <>
                      {token.blacklistEnabled && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-text-primary">Blacklist Management</h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={blacklistAddress}
                              onChange={(e) => setBlacklistAddress(e.target.value)}
                              placeholder="Address to blacklist/unblacklist"
                              className="flex-1 p-2 rounded bg-background-primary border border-border hover:border-border-light focus:border-text-accent text-text-primary placeholder-text-secondary"
                            />
                            <button
                              onClick={() => handleBlacklist(token.address, blacklistAddress, true)}
                              disabled={isLoading || !blacklistAddress}
                              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-background-secondary disabled:text-text-secondary"
                            >
                              Blacklist
                            </button>
                            <button
                              onClick={() => handleBlacklist(token.address, blacklistAddress, false)}
                              disabled={isLoading || !blacklistAddress}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-background-secondary disabled:text-text-secondary"
                            >
                              Unblacklist
                            </button>
                          </div>
                        </div>
                      )}

                      {token.timeLockEnabled && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-text-primary">Time Lock Management</h4>
                          <p className="text-sm text-text-secondary">Time lock management coming soon...</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 