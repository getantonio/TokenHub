import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, Log } from 'ethers';
import TokenFactoryV2 from '../contracts/abi/TokenFactory_v2.1.0.json';
import TokenTemplateV2 from '../contracts/abi/TokenTemplate_v2.1.0.json';
import { getNetworkContractAddress } from '../config/contracts';
import { getExplorerUrl } from '../config/networks';
import { useNetwork } from '../contexts/NetworkContext';
import { Toast } from './ui/Toast';
import { Spinner } from './ui/Spinner';
import { ethers } from 'ethers';

const TOKEN_DECIMALS = 18;

interface TokenAdminV2Props {
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
  presaleInfo: {
    softCap: string;
    hardCap: string;
    minContribution: string;
    maxContribution: string;
    startTime: number;
    endTime: number;
    presaleRate: string;
    whitelistEnabled: boolean;
    finalized: boolean;
    totalContributed: string;
  };
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

interface LockInfo {
  address: string;
  duration: number;
  lockUntil?: number;
}

export default function TokenAdminV2({ isConnected, address }: TokenAdminV2Props) {
  const { chainId } = useNetwork();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [blacklistAddress, setBlacklistAddress] = useState('');
  const [lockInfo, setLockInfo] = useState<LockInfo>({ address: '', duration: 30 });
  const [currentWallet, setCurrentWallet] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum && isConnected) {
        try {
          const newProvider = new BrowserProvider(window.ethereum);
          setProvider(newProvider);
        } catch (error) {
          console.error("Error initializing provider:", error);
        }
      }
    };

    initProvider();
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && chainId && provider && address) {
      console.log("Dependencies changed, reloading tokens:", {
        isConnected,
        chainId,
        hasProvider: !!provider,
        address
      });
      loadTokens();
    }
  }, [isConnected, chainId, provider, address]);

  // Reload tokens periodically to catch new ones
  useEffect(() => {
    if (isConnected && chainId && provider && address) {
      const interval = setInterval(() => {
        loadTokens();
      }, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isConnected, chainId, provider, address]);

  useEffect(() => {
    const updateWallet = async () => {
      if (isConnected && window.ethereum && provider) {
        try {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setCurrentWallet(address);
        } catch (error) {
          console.error("Error getting wallet address:", error);
        }
      }
    };

    updateWallet();
  }, [isConnected, provider]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadTokens = async () => {
    if (!isConnected || !window.ethereum || !chainId || !provider) {
      console.error("Missing dependencies");
      return;
    }

    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      
      const factoryV2Address = getNetworkContractAddress(chainId, 'factoryAddressV2');
      if (!factoryV2Address) {
        showToast('error', 'No V2 factory deployed on this network');
        return;
      }

      console.log("Loading tokens for:", {
        chainId,
        factoryV2Address
      });
      const factoryV2 = new Contract(factoryV2Address, TokenFactoryV2.abi, provider);
      
      // Try to get all deployed tokens first
      try {
        const deployedTokens = await factoryV2.getDeployedTokens();
        console.log("Found deployedTokens:", deployedTokens);
        
        if (deployedTokens && deployedTokens.length > 0) {
          const tokenPromises = deployedTokens.map(async (tokenAddr: string) => {
            try {
              const token = new Contract(tokenAddr, TokenTemplateV2.abi, provider);
              const [name, symbol, totalSupply, blacklistEnabled, timeLockEnabled, presaleStatus] = await Promise.all([
                token.name(),
                token.symbol(),
                token.totalSupply(),
                token.blacklistEnabled(),
                token.timeLockEnabled(),
                token.getPresaleStatus()
              ]);

              return {
                address: tokenAddr,
                name,
                symbol,
                totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                blacklistEnabled,
                timeLockEnabled,
                presaleInfo: {
                  softCap: formatUnits(presaleStatus.softCap, TOKEN_DECIMALS),
                  hardCap: formatUnits(presaleStatus.hardCap, TOKEN_DECIMALS),
                  minContribution: formatUnits(presaleStatus.minContribution, TOKEN_DECIMALS),
                  maxContribution: formatUnits(presaleStatus.maxContribution, TOKEN_DECIMALS),
                  startTime: Number(presaleStatus.startTime),
                  endTime: Number(presaleStatus.endTime),
                  presaleRate: formatUnits(presaleStatus.presaleRate, TOKEN_DECIMALS),
                  whitelistEnabled: presaleStatus.whitelistEnabled,
                  finalized: presaleStatus.finalized,
                  totalContributed: formatUnits(presaleStatus.totalContributed, TOKEN_DECIMALS)
                }
              };
            } catch (error) {
              console.error(`Error checking token ${tokenAddr}:`, error);
              return null;
            }
          });

          const tokenResults = await Promise.all(tokenPromises);
          const validTokens = tokenResults.filter(Boolean);
          if (validTokens.length > 0) {
            setTokens(validTokens as TokenInfo[]);
            return;
          }
        }
      } catch (error) {
        console.error("deployedTokens failed, trying event logs...", error);
      }

      // Fallback to event logs
      const currentBlock = await provider.getBlockNumber();
      // Search last 100,000 blocks instead of 2.5M to speed up the search
      const fromBlock = Math.max(0, currentBlock - 100000);

      console.log(`\nSearching for events from block ${fromBlock} to ${currentBlock}`);

      // Get all logs from the factory contract since no parameters are indexed
      const logs = await provider.getLogs({
        address: factoryV2Address,
        fromBlock,
        toBlock: currentBlock
      });
      console.log("Found logs:", logs.length);

      const foundTokens: TokenInfo[] = [];
      const processedAddresses = new Set<string>();

      for (const log of logs) {
        try {
          const parsedLog = factoryV2.interface.parseLog({
            topics: log.topics || [],
            data: log.data
          });
          if (!parsedLog || parsedLog.name !== 'TokenCreated') {
            console.log("Skipping non-TokenCreated log:", parsedLog?.name);
            continue;
          }

          console.log("Processing TokenCreated event:", {
            token: parsedLog.args[0],
            name: parsedLog.args[1],
            symbol: parsedLog.args[2],
            owner: parsedLog.args[3]
          });

          const tokenAddr = parsedLog.args[0] as string;
          if (!tokenAddr || !ethers.isAddress(tokenAddr)) continue;

          const normalizedAddr = tokenAddr.toLowerCase();
          if (processedAddresses.has(normalizedAddr)) continue;

          const code = await provider.getCode(normalizedAddr);
          if (code === '0x') continue;

          console.log("Checking token contract at:", normalizedAddr);
          const token = new Contract(normalizedAddr, TokenTemplateV2.abi, provider);
          const [name, symbol, totalSupply, blacklistEnabled, timeLockEnabled, presaleStatus] = await Promise.all([
            token.name(),
            token.symbol(),
            token.totalSupply(),
            token.blacklistEnabled(),
            token.timeLockEnabled(),
            token.getPresaleStatus()
          ]);

          if (!foundTokens.some(t => t.address.toLowerCase() === normalizedAddr)) {
            foundTokens.push({
              address: normalizedAddr,
              name,
              symbol,
              totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
              blacklistEnabled,
              timeLockEnabled,
              presaleInfo: {
                softCap: formatUnits(presaleStatus.softCap, TOKEN_DECIMALS),
                hardCap: formatUnits(presaleStatus.hardCap, TOKEN_DECIMALS),
                minContribution: formatUnits(presaleStatus.minContribution, TOKEN_DECIMALS),
                maxContribution: formatUnits(presaleStatus.maxContribution, TOKEN_DECIMALS),
                startTime: Number(presaleStatus.startTime),
                endTime: Number(presaleStatus.endTime),
                presaleRate: formatUnits(presaleStatus.presaleRate, TOKEN_DECIMALS),
                whitelistEnabled: presaleStatus.whitelistEnabled,
                finalized: presaleStatus.finalized,
                totalContributed: formatUnits(presaleStatus.totalContributed, TOKEN_DECIMALS)
              }
            });
            processedAddresses.add(normalizedAddr);
          }
        } catch (error) {
          console.error("Error processing log:", error);
        }
      }

      if (foundTokens.length > 0) {
        console.log("Setting found tokens:", foundTokens);
        setTokens(foundTokens);
      }
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
      const token = new Contract(tokenAddress, TokenTemplateV2.abi, signer);

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

  const handleSetLockTime = async (tokenAddress: string, addressToLock: string, durationDays: number) => {
    if (!isConnected || !window.ethereum) return;

    if (addressToLock.toLowerCase() === currentWallet.toLowerCase()) {
      if (!window.confirm('Warning: You are about to lock your own address. This will prevent you from transferring tokens. Are you sure?')) {
        return;
      }
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplateV2.abi, signer);

      const lockUntil = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);
      
      const tx = await token.setTimeLock(addressToLock, lockUntil);
      showToast('success', 'Transaction submitted...');
      
      await tx.wait();
      showToast('success', `Address locked until ${new Date(lockUntil * 1000).toLocaleString()}`);
      setLockInfo({ address: '', duration: 30 });
    } catch (error: any) {
      console.error('Error setting lock time:', error);
      showToast('error', error.message || 'Failed to set lock time');
    } finally {
      setIsLoading(false);
    }
  };

  const checkLockTime = async (tokenAddress: string, addressToCheck: string) => {
    if (!isConnected || !window.ethereum) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplateV2.abi, signer);

      const lockTime = await token.getTimeLock(addressToCheck);
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (lockTime > currentTime) {
        const daysLeft = Math.ceil((lockTime - currentTime) / (24 * 60 * 60));
        showToast('success', `Address is locked for ${daysLeft} more days (until ${new Date(lockTime * 1000).toLocaleString()})`);
      } else {
        showToast('success', 'Address is not locked');
      }
    } catch (error: any) {
      console.error('Error checking lock time:', error);
      showToast('error', error.message || 'Failed to check lock time');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizePresale = async (tokenAddress: string) => {
    if (!isConnected || !window.ethereum) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplateV2.abi, signer);

      const tx = await token.finalize();
      showToast('success', 'Transaction submitted...');
      
      await tx.wait();
      showToast('success', 'Presale finalized successfully');
      loadTokens();
    } catch (error: any) {
      console.error('Error finalizing presale:', error);
      showToast('error', error.message || 'Failed to finalize presale');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (!isConnected) {
    return (
      <div className="p-1 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xs font-medium text-text-primary">Token Management (V2)</h2>
        <p className="text-xs text-text-secondary">Please connect your wallet to manage tokens.</p>
      </div>
    );
  }

  return (
    <div className="p-2 relative bg-gray-800 rounded-lg shadow-lg">
      <div
        className="flex justify-between items-center cursor-pointer py-0.5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xs font-medium text-text-primary">Token Management (V2)</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadTokens();
            }}
            className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          >
            Refresh
          </button>
          <button className="text-text-accent hover:text-blue-400">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>
      
      {toast && <Toast type={toast.type} message={toast.message} />}
      
      {isExpanded && (
        isLoading ? (
          <div className="flex justify-center items-center py-1">
            <Spinner className="w-4 h-4 text-text-primary" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="mt-0.5">
            <p className="text-xs text-text-secondary">No V2 tokens found. Deploy a new token to get started.</p>
          </div>
        ) : (
          <div className="space-y-2 mt-1">
            {tokens.map(token => (
              <div key={token.address} className="border border-border rounded-lg p-2 space-y-2 bg-background-secondary">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{token.name} ({token.symbol})</h3>
                    <p className="text-xs text-text-secondary">Address: {token.address}</p>
                    <p className="text-xs text-text-secondary">Total Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                  </div>
                  <button
                    onClick={() => setSelectedToken(selectedToken === token.address ? null : token.address)}
                    className="text-xs text-text-accent hover:text-blue-400"
                  >
                    {selectedToken === token.address ? 'Hide' : 'Manage'}
                  </button>
                </div>

                {selectedToken === token.address && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <div className="flex gap-1">
                      <a
                        href={getExplorerUrl(chainId || 0, token.address, 'token')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-accent hover:text-blue-400"
                      >
                        View on Etherscan ↗
                      </a>
                    </div>

                    {/* Presale Information */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-text-primary">Presale Status</h4>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <p className="text-xs text-text-secondary">Soft Cap: {token.presaleInfo.softCap} ETH</p>
                          <p className="text-xs text-text-secondary">Hard Cap: {token.presaleInfo.hardCap} ETH</p>
                          <p className="text-xs text-text-secondary">Min Contribution: {token.presaleInfo.minContribution} ETH</p>
                          <p className="text-xs text-text-secondary">Max Contribution: {token.presaleInfo.maxContribution} ETH</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Start Time: {formatDate(token.presaleInfo.startTime)}</p>
                          <p className="text-xs text-text-secondary">End Time: {formatDate(token.presaleInfo.endTime)}</p>
                          <p className="text-xs text-text-secondary">Rate: {token.presaleInfo.presaleRate} tokens/ETH</p>
                          <p className="text-xs text-text-secondary">Total Contributed: {token.presaleInfo.totalContributed} ETH</p>
                        </div>
                      </div>
                      {!token.presaleInfo.finalized && (
                        <button
                          onClick={() => handleFinalizePresale(token.address)}
                          className="mt-1 px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                          disabled={Date.now() / 1000 < token.presaleInfo.endTime}
                        >
                          Finalize Presale
                        </button>
                      )}
                    </div>

                    {!token.blacklistEnabled && !token.timeLockEnabled ? (
                      <p className="text-xs text-text-secondary italic">This token was created without blacklist or timelock features.</p>
                    ) : (
                      <>
                        {token.blacklistEnabled && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-text-primary">Blacklist Management</h4>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={blacklistAddress}
                                onChange={(e) => setBlacklistAddress(e.target.value)}
                                placeholder="Address to blacklist/unblacklist"
                                className="flex-1 p-1 text-xs rounded bg-background-primary border border-border hover:border-border-light focus:border-text-accent text-text-primary placeholder-text-secondary"
                              />
                              <button
                                onClick={() => handleBlacklist(token.address, blacklistAddress, true)}
                                className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-500 hover:bg-red-500/30"
                              >
                                Blacklist
                              </button>
                              <button
                                onClick={() => handleBlacklist(token.address, blacklistAddress, false)}
                                className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-500 hover:bg-green-500/30"
                              >
                                Unblacklist
                              </button>
                            </div>
                          </div>
                        )}

                        {token.timeLockEnabled && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-text-primary">Time Lock Management</h4>
                            <p className="text-xs text-text-secondary">Lock token transfers for a specific address for a set duration.</p>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={lockInfo.address}
                                onChange={(e) => setLockInfo({ ...lockInfo, address: e.target.value })}
                                placeholder="Address to lock/check"
                                className="flex-1 p-1 text-xs rounded bg-background-primary border border-border hover:border-border-light focus:border-text-accent text-text-primary placeholder-text-secondary"
                              />
                              <input
                                type="number"
                                value={lockInfo.duration}
                                onChange={(e) => setLockInfo({ ...lockInfo, duration: parseInt(e.target.value) || 0 })}
                                min="1"
                                max="365"
                                placeholder="Days"
                                className="w-16 p-1 text-xs rounded bg-background-primary border border-border hover:border-border-light focus:border-text-accent text-text-primary"
                              />
                              <button
                                onClick={() => handleSetLockTime(token.address, lockInfo.address, lockInfo.duration)}
                                className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                              >
                                Lock
                              </button>
                              <button
                                onClick={() => checkLockTime(token.address, lockInfo.address)}
                                className="px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                              >
                                Check
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
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