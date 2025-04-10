import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, Interface } from 'ethers';
import TokenFactory_v1 from '@contracts/abi/TokenFactory_v1.json';
import TokenTemplate_v1 from '@contracts/abi/TokenTemplate_v1.json';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Spinner } from '@components/ui/Spinner';
import { Input } from '@components/ui/input';
import { useToast } from '@/components/ui/toast/use-toast';
import { useAccount, useChainId } from 'wagmi';
import { getExplorerUrl } from '@config/networks';
import { Tooltip } from '@components/ui/tooltip';
import { InfoIcon } from '@components/ui/InfoIcon';
import { FACTORY_ADDRESSES } from '@config/contracts';
import { ChainId } from '@/types/network';

// Add the ABI for our new AmoyTokenFactory
const AMOY_FACTORY_ABI = [
  "function owner() external view returns (address)",
  "function deploymentFee() external view returns (uint256)",
  "function getTokensByUser(address) external view returns (address[])",
  "function createToken(string,string,uint256) external payable returns (address)",
  "function isTokenFromFactory(address) external view returns (bool)",
  "event TokenCreated(address indexed tokenAddress, address indexed creator)"
];

// Function to get appropriate ABI based on network
const getFactoryABI = (chainId: number | null) => {
  if (chainId === 80002 || chainId === 421614) {
    return AMOY_FACTORY_ABI;
  }
  return TokenFactory_v1.abi;
};

// Define the TokenTemplate ABI separately if needed for actions
const TOKEN_TEMPLATE_ABI = TokenTemplate_v1.abi;

// Define the helper function LOCALLY within this component
const getExplorerUrlWithType = (chainId: number | null | undefined, addressOrHash: string, type: 'token' | 'tx' | 'address' = 'address'): string => {
  if (!chainId) return '#';
  // getExplorerUrl only accepts chainId and returns the base URL
  const baseUrl = getExplorerUrl(chainId as ChainId);
  if (!baseUrl) return '#'; // Handle case where base URL isn't found
  // We then append the type and address ourselves
  return `${baseUrl}/${type === 'tx' ? 'tx' : 'address'}/${addressOrHash}`;
};

interface Props {
  isConnected: boolean;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: number;
}

interface BlacklistAction {
  address: string;
  action: 'add' | 'remove';
}

interface TimeLockAction {
  address: string;
  duration: number;
}

export default function TCAP_v1({ isConnected }: Props) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenTokens, setHiddenTokens] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hiddenTokensV1');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [blacklistAction, setBlacklistAction] = useState<BlacklistAction>({ address: '', action: 'add' });
  const [timeLockAction, setTimeLockAction] = useState<TimeLockAction>({ address: '', duration: 30 });
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const currentProvider = new BrowserProvider(window.ethereum);
      setProvider(currentProvider);

      const handleChainChanged = () => {
        console.log("Network changed, re-initializing provider...");
        setProvider(new BrowserProvider(window.ethereum));
      };

      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (isConnected && address && provider && chainId) {
      console.log(`Dependencies updated. isConnected: ${isConnected}, address: ${address}, provider set: ${!!provider}, chainId: ${chainId}. Reloading tokens.`);
      loadTokens();
    } else {
      console.log(`Dependencies not met. isConnected: ${isConnected}, address: ${address}, provider set: ${!!provider}, chainId: ${chainId}. Clearing tokens.`);
      setTokens([]);
    }
  }, [isConnected, address, provider, chainId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hiddenTokensV1', JSON.stringify(hiddenTokens));
    }
  }, [hiddenTokens]);

  const loadTokens = async () => {
    if (!provider) {
      console.warn("loadTokens called without provider.");
      setError("Provider not initialized.");
      setIsLoading(false);
      setTokens([]);
      return;
    }
    if (!address) {
      console.warn("loadTokens called without address.");
      setError("Wallet address not available.");
      setIsLoading(false);
      setTokens([]);
      return;
    }
    if (!chainId) {
      console.warn("loadTokens called without chainId.");
      setError("Network chain ID not available.");
      setIsLoading(false);
      setTokens([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      let factoryAddress;
      if (chainId === 80002) {
        factoryAddress = process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1;
      } else if (chainId === 421614) {
        factoryAddress = process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1;
      } else {
        factoryAddress = FACTORY_ADDRESSES.v1[chainId];
      }

      if (!factoryAddress) {
        setError('Factory address not available for this network');
        setTokens([]);
        setIsLoading(false);
        return;
      }
      
      console.log("Loading tokens from factory:", factoryAddress);
      
      const factory = new Contract(factoryAddress, getFactoryABI(chainId), provider);
      const userAddress = address;
      
      const deployedTokens = await factory.getTokensByUser(userAddress);

      const tokenPromises = deployedTokens.map(async (tokenAddress: string) => {
        try {
          const tokenContract = new Contract(
            tokenAddress,
            TokenTemplate_v1.abi,
            provider
          );

          const [name, symbol, totalSupply, decimals] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.totalSupply(),
            tokenContract.decimals()
          ]);

          return {
            address: tokenAddress,
            name,
            symbol,
            totalSupply: formatUnits(totalSupply, decimals),
            decimals
          };
        } catch (error) {
          console.error(`Error loading token ${tokenAddress}:`, error);
          return null;
        }
      });

      const loadedTokens = (await Promise.all(tokenPromises))
        .filter((token): token is TokenInfo => token !== null)
        .sort((a, b) => a.name.localeCompare(b.name));

      setTokens(loadedTokens);
    } catch (error: any) {
      console.error('Error loading tokens:', error);
      if (error.code === 'NETWORK_ERROR') {
        setError('Network changed. Please refresh tokens or reconnect wallet.');
        setTokens([]);
      } else {
        setError('Failed to load tokens. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hideToken = (tokenAddress: string) => {
    setHiddenTokens(prev => [...prev, tokenAddress]);
    toast({
      title: 'Token Hidden',
      description: 'Token has been hidden from the list',
    });
  };

  const resetHiddenTokens = () => {
    setHiddenTokens([]);
    toast({
      title: "Hidden tokens cleared",
      description: "All tokens are now visible",
    });
  };

  const getVisibleTokens = () => {
    return tokens.filter(token => !hiddenTokens.includes(token.address));
  };

  const handleBlacklist = async (tokenAddress: string) => {
    if (!provider || !address) {
      toast({ variant: 'destructive', title: 'Error', description: 'Wallet not connected'});
      return;
    }

    try {
      setIsLoading(true);
      const signer = await provider.getSigner(address);
      
      // Create an Interface instance for the token contract
      const tokenInterface = new Interface(TOKEN_TEMPLATE_ABI);
      // Encode the function call data
      const data = tokenInterface.encodeFunctionData('setBlacklistStatus', [
        blacklistAction.address,
        blacklistAction.action === 'add'
      ]);

      // Send the transaction
      const tx = await signer.sendTransaction({
        to: tokenAddress,
        data: data,
      });
      
      toast({ title: 'Transaction Submitted', description: 'Please wait for confirmation...' });
      
      await tx.wait();
      
      toast({ title: 'Success', description: `Address ${blacklistAction.action === 'add' ? 'blacklisted' : 'unblacklisted'} successfully` });
      
      setBlacklistAction({ address: '', action: 'add' });
      await loadTokens(); // Refresh tokens after action
    } catch (error: any) {
      console.error('Error managing blacklist:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to manage blacklist' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeLock = async (tokenAddress: string) => {
    if (!provider || !address) {
      toast({ variant: 'destructive', title: 'Error', description: 'Wallet not connected'});
      return;
    }

    try {
      setIsLoading(true);
      const signer = await provider.getSigner(address);
      
      // Create an Interface instance for the token contract
      const tokenInterface = new Interface(TOKEN_TEMPLATE_ABI);
      // Calculate lock time
      const lockUntil = Math.floor(Date.now() / 1000) + (timeLockAction.duration * 24 * 60 * 60);
      // Encode the function call data
      const data = tokenInterface.encodeFunctionData('setLockTime', [
        timeLockAction.address, 
        lockUntil
      ]);

      // Send the transaction
      const tx = await signer.sendTransaction({
        to: tokenAddress,
        data: data,
      });
      
      toast({ title: 'Transaction Submitted', description: 'Please wait for confirmation...' });
      
      await tx.wait();
      
      toast({ title: 'Success', description: `Address locked until ${new Date(lockUntil * 1000).toLocaleString()}` });
      
      setTimeLockAction({ address: '', duration: 30 });
    } catch (error: any) {
       console.error('Error setting time lock:', error);
       toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to set time lock' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-1 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xs font-medium text-text-primary">Token Management (V1)</h2>
        <p className="text-xs text-text-secondary">Please connect your wallet to manage tokens.</p>
      </div>
    );
  }

  return (
    <div className="form-card">
      <div
        className="flex justify-between items-center cursor-pointer py-1"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-medium text-text-primary">Token Creator Admin Controles (V1)</h2>
          <span className="text-xs text-text-secondary">
            {getVisibleTokens().length} tokens
          </span>
        </div>
        <div className="flex items-center gap-1">
          {hiddenTokens.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetHiddenTokens();
              }}
              className="btn-blue btn-small"
            >
              Show All ({hiddenTokens.length})
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadTokens();
            }}
            className="btn-blue btn-small"
          >
            Refresh
          </button>
          <span className="text-text-accent hover:text-blue-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {isExpanded && (
        isLoading ? (
          <div className="flex justify-center items-center py-1">
            <Spinner className="w-4 h-4 text-text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-2 text-red-400">
            {error}
          </div>
        ) : getVisibleTokens().length === 0 ? (
          <div className="mt-2">
            <p className="text-sm text-text-secondary">No V1 tokens found. Deploy a new token to get started.</p>
          </div>
        ) : (
          <div className="space-y-1 mt-2">
            {getVisibleTokens().map(token => (
              <div key={token.address} className="border border-border rounded-lg p-2 bg-gray-800">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">{token.name} ({token.symbol})</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Token: {token.address}</p>
                    <p className="text-xs text-text-secondary">Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSelectedToken(selectedToken === token.address ? null : token.address)}
                      className="btn-blue btn-small"
                    >
                      {selectedToken === token.address ? 'Hide' : 'Manage'}
                    </button>
                    <button
                      onClick={() => hideToken(token.address)}
                      className="btn-small bg-gray-700 hover:bg-gray-600 text-gray-300"
                      title="Hide token"
                    >
                      Hide
                    </button>
                  </div>
                </div>

                {selectedToken === token.address && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="space-y-1">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-medium text-text-primary">Token Explorer</h4>
                        <a
                          href={getExplorerUrlWithType(chainId, token.address, 'token')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-blue btn-small w-fit"
                        >
                          View on Explorer
                        </a>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-medium text-text-primary">Blacklist Management</h4>
                          <InfoIcon content="Add or remove addresses from the blacklist to control token transfers. Blacklisted addresses cannot send or receive tokens." />
                        </div>
                        <div className="flex gap-1">
                          <Input
                            type="text"
                            placeholder="Address to blacklist"
                            value={blacklistAction.address}
                            onChange={(e) => setBlacklistAction(prev => ({ ...prev, address: e.target.value }))}
                            className="flex-1 h-7 text-xs bg-gray-900"
                          />
                          <select
                            value={blacklistAction.action}
                            onChange={(e) => setBlacklistAction(prev => ({ ...prev, action: e.target.value as 'add' | 'remove' }))}
                            className="h-7 rounded bg-gray-900 text-xs border-gray-700 text-white"
                          >
                            <option value="add">Add</option>
                            <option value="remove">Remove</option>
                          </select>
                          <button
                            onClick={() => handleBlacklist(token.address)}
                            disabled={!blacklistAction.address}
                            className="btn-blue btn-small"
                          >
                            Apply
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-medium text-text-primary">TimeLock Management</h4>
                          <InfoIcon content="Lock addresses for a specified duration to prevent token transfers. Locked addresses can still receive tokens but cannot send them until the lock period expires." />
                        </div>
                        <div className="flex gap-1">
                          <Input
                            type="text"
                            placeholder="Address to lock"
                            value={timeLockAction.address}
                            onChange={(e) => setTimeLockAction(prev => ({ ...prev, address: e.target.value }))}
                            className="flex-1 h-7 text-xs bg-gray-900"
                          />
                          <Input
                            type="number"
                            placeholder="Days"
                            value={timeLockAction.duration}
                            onChange={(e) => setTimeLockAction(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                            className="w-20 h-7 text-xs bg-gray-900"
                            min="1"
                          />
                          <button
                            onClick={() => handleTimeLock(token.address)}
                            disabled={!timeLockAction.address || timeLockAction.duration <= 0}
                            className="btn-blue btn-small"
                          >
                            Lock
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
} 