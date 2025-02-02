import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import TokenFactory_v1 from '@contracts/abi/TokenFactory_v1.1.0.json';
import TokenTemplate_v1 from '@contracts/abi/TokenTemplate_v1.1.0.json';
import { getNetworkContractAddress } from '@config/contracts';
import { getExplorerUrl } from '@config/networks';
import { useNetwork } from '@contexts/NetworkContext';
import { Toast } from '@components/ui/Toast';
import { Spinner } from '@components/ui/Spinner';
import { ethers } from 'ethers';
import { AbiCoder } from 'ethers';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';

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
  const [hiddenTokens, setHiddenTokens] = useState<string[]>([]);

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
    if (!isConnected || !chainId || !externalProvider || !address) {
      console.log("Cannot load tokens - missing requirements:", {
        isConnected,
        chainId,
        hasProvider: !!externalProvider,
        factoryAddress: address
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log("Starting token loading process...");
      setTokens([]);
      const foundTokens: TokenInfo[] = [];
      const processedAddresses = new Set<string>();

      const signer = await externalProvider.getSigner();
      console.log("Connected with signer:", await signer.getAddress());

      // Log the factory address being used
      console.log('Using factory address:', address);

      // Verify factory contract exists
      const code = await externalProvider.getCode(address);
      console.log('Factory contract code length:', code.length);
      if (code === '0x') {
        console.error('No contract found at factory address');
        showToast('error', 'Factory contract not found at specified address');
        return;
      }

      const factory = new Contract(address, TokenFactory_v1.abi, signer);
      console.log("Factory contract initialized");
      
      try {
        // First try direct token list if available
        console.log('Attempting to get tokens directly from factory...');
        const tokenList = await factory.getDeployedTokens().catch((e: Error) => {
          console.log('Direct token list not available:', e.message);
          return null;
        });

        if (tokenList && tokenList.length > 0) {
          console.log(`Found ${tokenList.length} tokens directly from factory`);
          // Process direct token list
          for (const addr of tokenList) {
            console.log(`Processing token at address: ${addr}`);
            try {
              const normalizedAddr = addr.toLowerCase();
              if (processedAddresses.has(normalizedAddr)) {
                console.log(`Skipping already processed token: ${normalizedAddr}`);
                continue;
              }

              // Verify contract exists
              const code = await externalProvider.getCode(normalizedAddr);
              if (code === '0x') {
                console.log(`Skipping address with no code: ${normalizedAddr}`);
                continue;
              }

              const token = new Contract(normalizedAddr, TokenTemplate_v1.abi, externalProvider);
              console.log(`Token contract initialized for: ${normalizedAddr}`);
              
              // Get token info with retries
              let retries = 3;
              let tokenInfo = null;
              
              while (retries > 0 && !tokenInfo) {
                try {
                  console.log(`Attempt ${4-retries}/3 to get token info for: ${normalizedAddr}`);
                  const [name, symbol, totalSupply] = await Promise.all([
                    token.name().catch(() => 'Unknown'),
                    token.symbol().catch(() => 'UNK'),
                    token.totalSupply().catch(() => '0')
                  ]);

                  let blacklistEnabled = false;
                  let timeLockEnabled = false;

                  try {
                    await token.blacklistEnabled();
                    blacklistEnabled = true;
                  } catch (e) {
                    console.log(`Blacklist not enabled for: ${normalizedAddr}`);
                  }

                  try {
                    await token.timeLockEnabled();
                    timeLockEnabled = true;
                  } catch (e) {
                    console.log(`Timelock not enabled for: ${normalizedAddr}`);
                  }

                  if (!foundTokens.some(t => t.address.toLowerCase() === normalizedAddr)) {
                    tokenInfo = {
                      address: normalizedAddr,
                      name,
                      symbol,
                      totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                      blacklistEnabled,
                      timeLockEnabled
                    };
                    console.log(`Token info retrieved:`, tokenInfo);
                    foundTokens.push(tokenInfo);
                    processedAddresses.add(normalizedAddr);
                  }
                } catch (error) {
                  console.error(`Retry ${3 - retries + 1}/3 failed for token ${normalizedAddr}:`, error);
                  retries--;
                  if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
                  }
                }
              }
            } catch (error) {
              console.error("Error processing token:", error);
              continue;
            }
          }
          console.log(`Setting ${foundTokens.length} tokens to state`);
          setTokens(foundTokens);
        } else {
          // Fallback to event logs
          console.log('Falling back to event log search...');
          const currentBlock = await externalProvider.getBlockNumber();
          const startBlock = Math.max(0, currentBlock - 100000); // Last ~2 weeks of blocks
          
          console.log(`Searching events from block ${startBlock} to ${currentBlock}`);
          
          // Adjust block range based on network
          let blockRange = 200000; // default for most networks
          let fromBlock = 0;
          
          if (chainId === 421614) { // Arbitrum Sepolia
            blockRange = 2000;
            // Get deployment block from env or use a recent block range
            fromBlock = Math.max(0, currentBlock - blockRange);
          } else if (chainId === 11155420) { // OP Sepolia
            blockRange = 2000;
            // Get deployment block from env or use a recent block range
            fromBlock = Math.max(0, currentBlock - blockRange);
          } else {
            fromBlock = Math.max(0, currentBlock - blockRange);
          }

          console.log(`\nSearching for events from block ${fromBlock} to ${currentBlock} on chain ${chainId}`);
          console.log("Using factory address:", address);

          try {
            // Split the event search into smaller chunks to avoid timeout
            const chunkSize = 1000;
            const foundTokens: TokenInfo[] = [];
            const processedAddresses = new Set<string>();
            
            for (let startBlock = fromBlock; startBlock < currentBlock; startBlock += chunkSize) {
              const endBlock = Math.min(startBlock + chunkSize, currentBlock);
              console.log(`Searching blocks ${startBlock} to ${endBlock}...`);
              
              const filter = {
                address,
                fromBlock: startBlock,
                toBlock: endBlock,
                topics: [ethers.id("TokenCreated(address,string,string,address,uint256,uint256,bool,bool)")]
              };

              try {
                const logs = await externalProvider.getLogs(filter);
                console.log(`Found ${logs.length} logs in this chunk`);

                for (const log of logs) {
                  try {
                    const parsedLog = factory.interface.parseLog({
                      topics: log.topics || [],
                      data: log.data
                    });

                    if (!parsedLog || parsedLog.name !== 'TokenCreated') continue;

                    const tokenAddr = parsedLog.args[0] as string;
                    if (!tokenAddr || !ethers.isAddress(tokenAddr)) continue;

                    const normalizedAddr = tokenAddr.toLowerCase();
                    if (processedAddresses.has(normalizedAddr)) continue;

                    // Verify contract exists
                    const code = await externalProvider.getCode(normalizedAddr);
                    if (code === '0x') continue;

                    const token = new Contract(normalizedAddr, TokenTemplate_v1.abi, externalProvider);
                    
                    // Get token info with retries
                    let retries = 3;
                    let tokenInfo = null;
                    
                    while (retries > 0 && !tokenInfo) {
                      try {
                        const [name, symbol, totalSupply] = await Promise.all([
                          token.name().catch(() => 'Unknown'),
                          token.symbol().catch(() => 'UNK'),
                          token.totalSupply().catch(() => '0')
                        ]);

                        let blacklistEnabled = false;
                        let timeLockEnabled = false;

                        try {
                          await token.blacklistEnabled();
                          blacklistEnabled = true;
                        } catch (e) {}

                        try {
                          await token.timeLockEnabled();
                          timeLockEnabled = true;
                        } catch (e) {}

                        if (!foundTokens.some(t => t.address.toLowerCase() === normalizedAddr)) {
                          tokenInfo = {
                            address: normalizedAddr,
                            name,
                            symbol,
                            totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                            blacklistEnabled,
                            timeLockEnabled
                          };
                          foundTokens.push(tokenInfo);
                          processedAddresses.add(normalizedAddr);
                        }
                      } catch (error) {
                        console.error(`Retry ${3 - retries + 1}/3 failed for token ${normalizedAddr}:`, error);
                        retries--;
                        if (retries > 0) {
                          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
                        }
                      }
                    }
                  } catch (error) {
                    console.error("Error processing log:", error);
                    continue;
                  }
                }
              } catch (error) {
                console.error(`Error fetching logs for blocks ${startBlock}-${endBlock}:`, error);
                continue;
              }
            }

            console.log(`Found ${foundTokens.length} total tokens`);
            setTokens(foundTokens);
          } catch (error) {
            console.error("Error in loadTokens:", error);
            if (error instanceof Error) {
              showToast('error', `Failed to load tokens: ${error.message}`);
            } else {
              showToast('error', 'Failed to load tokens: Unknown error');
            }
          }
        }
      } catch (error) {
        console.error('Error in token loading:', error);
        if (error instanceof Error) {
          showToast('error', `Failed to load tokens: ${error.message}`);
        } else {
          showToast('error', 'Failed to load tokens: Unknown error');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlacklist = async (tokenAddress: string, addressToBlacklist: string, blacklist: boolean) => {
    if (!isConnected || !externalProvider) return;

    try {
      setIsLoading(true);
      const signer = await externalProvider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplate_v1.abi, signer);

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
    if (!isConnected || !externalProvider) return;

    try {
      setIsLoading(true);
      const signer = await externalProvider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplate_v1.abi, signer);

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
    if (!isConnected || !externalProvider) return;

    if (addressToLock.toLowerCase() === currentWallet.toLowerCase()) {
      if (!window.confirm('Warning: You are about to lock your own address. This will prevent you from transferring tokens. Are you sure?')) {
        return;
      }
    }

    try {
      setIsLoading(true);
      const signer = await externalProvider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplate_v1.abi, signer);

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

  function hideToken(address: string) {
    setHiddenTokens(prev => [...prev, address]);
  }

  function resetHiddenTokens() {
    setHiddenTokens([]);
  }

  function getVisibleTokens() {
    const visible = tokens.filter(token => !hiddenTokens.includes(token.address));
    console.log(`Showing ${visible.length}/${tokens.length} tokens (${hiddenTokens.length} hidden)`);
    return visible;
  }

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
        <h2 className="text-xs font-medium text-text-primary">TCAP_v1</h2>
        <div className="flex items-center gap-2">
          {hiddenTokens.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetHiddenTokens();
              }}
              className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            >
              Show All ({hiddenTokens.length})
            </button>
          )}
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
        ) : getVisibleTokens().length === 0 ? (
          <div className="mt-0.5">
            <p className="text-xs text-text-secondary">No V1 tokens found. Deploy a new token to get started.</p>
          </div>
        ) : (
          <div className="space-y-2 mt-1">
            {getVisibleTokens().map(token => (
              <div key={token.address} className="border border-border rounded-lg p-2 space-y-2 bg-background-secondary relative group">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{token.name} ({token.symbol})</h3>
                    <p className="text-xs text-text-secondary">Address: {token.address}</p>
                    <p className="text-xs text-text-secondary">Total Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedToken(selectedToken === token.address ? null : token.address)}
                      className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                    >
                      {selectedToken === token.address ? 'Hide' : 'Manage'}
                    </button>
                    <button
                      onClick={() => hideToken(token.address)}
                      className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-400 hover:bg-gray-500/20"
                      title="Hide token"
                    >
                      Hide
                    </button>
                  </div>
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