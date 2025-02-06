import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import TokenFactory_v1 from '@contracts/abi/TokenFactory_v1.json';
import TokenTemplate_v1 from '@contracts/abi/TokenTemplate_v1.json';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Spinner } from '@components/ui/Spinner';
import { Input } from '@components/ui/input';
import { useToast } from '@/components/ui/toast/use-toast';
import { useNetwork } from '@contexts/NetworkContext';
import { getExplorerUrl } from '@config/networks';
import { Tooltip } from '@components/ui/tooltip';
import { InfoIcon } from '@components/ui/InfoIcon';

interface Props {
  isConnected: boolean;
  address?: string;
  provider: BrowserProvider | null;
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

export default function TCAP_v1({ isConnected, address, provider: externalProvider }: Props) {
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
  const { chainId } = useNetwork();
  const { toast } = useToast();

  useEffect(() => {
    if (isConnected && address && externalProvider) {
      loadTokens();
    }
  }, [isConnected, address, externalProvider]);

  useEffect(() => {
    localStorage.setItem('hiddenTokensV1', JSON.stringify(hiddenTokens));
  }, [hiddenTokens]);

  const loadTokens = async () => {
    if (!externalProvider || !address) return;

    try {
      setIsLoading(true);
      setError(null);

      const factory = new Contract(address, TokenFactory_v1.abi, externalProvider);
      const signer = await externalProvider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Get tokens deployed by the connected user
      const deployedTokens = await factory.getTokensByUser(userAddress);

      const tokenPromises = deployedTokens.map(async (tokenAddress: string) => {
        try {
          const tokenContract = new Contract(
            tokenAddress,
            TokenTemplate_v1.abi,
            externalProvider
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
    } catch (error) {
      console.error('Error loading tokens:', error);
      setError('Failed to load tokens. Please try again.');
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
    if (!externalProvider || !window.ethereum) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplate_v1.abi, signer);

      const tx = await token.setBlacklistStatus(
        blacklistAction.address,
        blacklistAction.action === 'add'
      );
      
      toast({
        title: 'Transaction Submitted',
        description: 'Please wait for confirmation...',
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: `Address ${blacklistAction.action === 'add' ? 'blacklisted' : 'unblacklisted'} successfully`,
      });
      
      setBlacklistAction({ address: '', action: 'add' });
      await loadTokens();
    } catch (error: any) {
      console.error('Error managing blacklist:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to manage blacklist',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeLock = async (tokenAddress: string) => {
    if (!externalProvider || !window.ethereum) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplate_v1.abi, signer);

      const lockUntil = Math.floor(Date.now() / 1000) + (timeLockAction.duration * 24 * 60 * 60);
      const tx = await token.setLockTime(timeLockAction.address, lockUntil);
      
      toast({
        title: 'Transaction Submitted',
        description: 'Please wait for confirmation...',
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: `Address locked until ${new Date(lockUntil * 1000).toLocaleString()}`,
      });
      
      setTimeLockAction({ address: '', duration: 30 });
    } catch (error: any) {
      console.error('Error setting time lock:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to set time lock',
      });
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
                          href={getExplorerUrl(chainId, token.address, 'token')}
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