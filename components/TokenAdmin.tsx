import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import TokenFactoryV1 from '../contracts/abi/TokenFactory_v1.1.0.json';
import TokenTemplateV1 from '../contracts/abi/TokenTemplate_v1.1.0.json';
import { getNetworkContractAddress } from '../config/contracts';
import { getExplorerUrl } from '../config/networks';
import { useNetwork } from '../contexts/NetworkContext';
import { Toast } from './ui/Toast';
import { Spinner } from './ui/Spinner';
import { ethers } from 'ethers';
import { AbiCoder } from 'ethers';

const TOKEN_DECIMALS = 18; // Standard ERC20 decimals

interface TokenAdminProps {
  isConnected: boolean;
  address?: string;
  provider: BrowserProvider | null;
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
  link?: string;
}

interface LockInfo {
  address: string;
  duration: number;
  lockUntil?: number;
}

export default function TokenAdmin({ isConnected, address, provider: externalProvider }: TokenAdminProps) {
  const { chainId } = useNetwork();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [blacklistAddress, setBlacklistAddress] = useState('');
  const [lockInfo, setLockInfo] = useState<LockInfo>({ address: '', duration: 30 });
  const [currentWallet, setCurrentWallet] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isConnected && chainId && externalProvider && address) {
      console.log("Dependencies changed, reloading tokens:", {
        isConnected,
        chainId,
        hasProvider: !!externalProvider,
        address
      });
      loadTokens();
    }
  }, [isConnected, chainId, externalProvider, address]);

  useEffect(() => {
    const updateWallet = async () => {
      if (isConnected && window.ethereum && externalProvider) {
        try {
          const signer = await externalProvider.getSigner();
          const address = await signer.getAddress();
          setCurrentWallet(address);
        } catch (error) {
          console.error("Error getting wallet address:", error);
        }
      }
    };

    updateWallet();
  }, [isConnected, externalProvider]);

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({ type, message, link });
    setTimeout(() => setToast(null), 5000);
  };

  const loadTokens = async () => {
    if (!isConnected || !chainId || !externalProvider) {
      console.log("Missing dependencies:", { isConnected, chainId, hasProvider: !!externalProvider });
      return;
    }

    try {
      setIsLoading(true);
      console.log("Loading V1 tokens with params:", {
        chainId,
        address,
        isConnected,
        hasProvider: !!externalProvider
      });
      
      if (!address) {
        console.error("No factory address provided");
        return;
      }

      const factory = new Contract(address, TokenFactoryV1.abi, externalProvider);
      console.log("Factory contract initialized at:", address);

      // First try direct method
      try {
        console.log("Attempting to get deployed tokens directly...");
        const deployedTokens = await factory.getDeployedTokens();
        console.log("Raw deployed tokens response:", deployedTokens);

        if (deployedTokens && deployedTokens.length > 0) {
          console.log("Processing", deployedTokens.length, "tokens");
          const tokenPromises = deployedTokens.map(async (tokenAddr: string) => {
            try {
              console.log("Checking token contract at:", tokenAddr);
              const token = new Contract(tokenAddr, TokenTemplateV1.abi, externalProvider);
              
              // Check if contract exists
              const code = await externalProvider.getCode(tokenAddr);
              if (code === '0x') {
                console.log("No contract code found at:", tokenAddr);
                return null;
              }

              // First try to get basic token info
              const [name, symbol, totalSupply] = await Promise.all([
                token.name().catch((e: Error) => {
                  console.error("Error getting name:", e);
                  return 'Unknown';
                }),
                token.symbol().catch((e: Error) => {
                  console.error("Error getting symbol:", e);
                  return 'UNK';
                }),
                token.totalSupply().catch((e: Error) => {
                  console.error("Error getting totalSupply:", e);
                  return '0';
                })
              ]);

              // Then try to get optional features
              let blacklistEnabled = false;
              let timeLockEnabled = false;

              try {
                // Check if the contract has these functions by calling them
                await token.blacklistEnabled();
                blacklistEnabled = true;
              } catch (e) {
                console.log("blacklistEnabled not supported for token:", tokenAddr);
              }

              try {
                await token.timeLockEnabled();
                timeLockEnabled = true;
              } catch (e) {
                console.log("timeLockEnabled not supported for token:", tokenAddr);
              }

              const tokenInfo = {
                address: tokenAddr,
                name,
                symbol,
                totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                blacklistEnabled,
                timeLockEnabled
              };
              console.log("Successfully loaded token info:", tokenInfo);
              return tokenInfo;
            } catch (error) {
              console.error("Error loading token info for", tokenAddr, ":", error);
              return null;
            }
          });

          const loadedTokens = (await Promise.all(tokenPromises)).filter(Boolean);
          if (loadedTokens.length > 0) {
            console.log("Setting tokens from direct method:", loadedTokens);
            setTokens(loadedTokens as TokenInfo[]);
            return;
          }
        }
      } catch (error) {
        console.error("Direct token loading failed, trying event logs...", error);
      }

      // Fallback to event logs
      const currentBlock = await externalProvider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 200000); // Look back further

      console.log(`\nSearching for events from block ${fromBlock} to ${currentBlock}`);
      console.log("Using factory address:", address);

      const filter = {
        address,
        fromBlock,
        toBlock: currentBlock,
        topics: [ethers.id("TokenCreated(address,string,string)")]
      };

      console.log("Event filter:", filter);
      const logs = await externalProvider.getLogs(filter);
      console.log("Found logs:", logs.length);

      const foundTokens: TokenInfo[] = [];
      const processedAddresses = new Set<string>();

      for (const log of logs) {
        try {
          console.log("Processing log:", log);
          const parsedLog = factory.interface.parseLog({
            topics: log.topics || [],
            data: log.data
          });

          if (!parsedLog || parsedLog.name !== 'TokenCreated') {
            console.log("Skipping non-TokenCreated log:", parsedLog?.name);
            continue;
          }

          console.log("Parsed TokenCreated event:", parsedLog);
          const tokenAddr = parsedLog.args[0] as string;
          if (!tokenAddr || !ethers.isAddress(tokenAddr)) {
            console.log("Invalid token address:", tokenAddr);
            continue;
          }

          const normalizedAddr = tokenAddr.toLowerCase();
          if (processedAddresses.has(normalizedAddr)) {
            console.log("Already processed token:", normalizedAddr);
            continue;
          }

          // Verify contract exists
          const code = await externalProvider.getCode(normalizedAddr);
          if (code === '0x') {
            console.log("No contract code found at:", normalizedAddr);
            continue;
          }

          console.log("Loading token data for:", normalizedAddr);
          const token = new Contract(normalizedAddr, TokenTemplateV1.abi, externalProvider);
          
          // First try to get basic token info
          const [name, symbol, totalSupply] = await Promise.all([
            token.name().catch(() => 'Unknown'),
            token.symbol().catch(() => 'UNK'),
            token.totalSupply().catch(() => '0')
          ]);

          // Then try to get optional features
          let blacklistEnabled = false;
          let timeLockEnabled = false;

          try {
            await token.blacklistEnabled();
            blacklistEnabled = true;
          } catch (e) {
            console.log("blacklistEnabled not supported for token:", normalizedAddr);
          }

          try {
            await token.timeLockEnabled();
            timeLockEnabled = true;
          } catch (e) {
            console.log("timeLockEnabled not supported for token:", normalizedAddr);
          }

          if (!foundTokens.some(t => t.address.toLowerCase() === normalizedAddr)) {
            const tokenInfo = {
              address: normalizedAddr,
              name,
              symbol,
              totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
              blacklistEnabled,
              timeLockEnabled
            };
            console.log("Adding token to list:", tokenInfo);
            foundTokens.push(tokenInfo);
            processedAddresses.add(normalizedAddr);
          }
        } catch (error) {
          console.error("Error processing log:", error);
        }
      }

      if (foundTokens.length > 0) {
        console.log("Setting tokens from event logs:", foundTokens);
        setTokens(foundTokens);
      } else {
        console.log("No tokens found");
        setTokens([]);
      }
    } catch (error) {
      console.error("Error in loadTokens:", error);
      showToast('error', 'Failed to load tokens');
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
      const token = new Contract(tokenAddress, TokenTemplateV1.abi, signer);

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

  const checkLockTime = async (tokenAddress: string, addressToCheck: string) => {
    if (!isConnected || !window.ethereum) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplateV1.abi, signer);

      const lockTime = await token.getLockTime(addressToCheck);
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
      const token = new Contract(tokenAddress, TokenTemplateV1.abi, signer);

      const lockUntil = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);
      
      const tx = await token.setLockTime(addressToLock, lockUntil);
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

  if (!isConnected) {
    return (
      <div className="p-2 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xs font-medium text-text-primary">Token Management (V1)</h2>
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
        <h2 className="text-xs font-medium text-text-primary">Token Management (V1)</h2>
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
      
      {toast && <Toast type={toast.type} message={toast.message} link={toast.link} />}
      
      {isExpanded && (
        isLoading ? (
          <div className="flex justify-center items-center py-1">
            <Spinner className="w-4 h-4 text-text-primary" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="mt-0.5">
            <p className="text-xs text-text-secondary">No V1 tokens found. Deploy a new token to get started.</p>
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
                    className="text-text-accent hover:text-blue-400"
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