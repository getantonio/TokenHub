import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import TokenFactoryV1 from '../contracts/abi/TokenFactory_v1.json';
import TokenTemplateV1 from '../contracts/abi/TokenTemplate_v1.json';
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

interface LockInfo {
  address: string;
  duration: number;
  lockUntil?: number;
}

export default function TokenAdmin({ isConnected, address }: TokenAdminProps) {
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

  // Initialize provider when component mounts or wallet connection changes
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

  // Load tokens when dependencies are available
  useEffect(() => {
    if (isConnected && chainId && provider && address) {
      loadTokens();
    }
  }, [isConnected, chainId, provider, address]);

  // Update current wallet
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
      console.error("Missing dependencies:", {
        isConnected,
        hasEthereum: !!window.ethereum,
        chainId,
        hasProvider: !!provider
      });
      return;
    }

    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      const userAddress = address || await signer.getAddress();
      
      // Check factories on this network
      const factoryV1Address = getNetworkContractAddress(chainId, 'factoryAddress');
      if (!factoryV1Address) {
        showToast('error', 'No V1 factory deployed on this network');
        return;
      }

      console.log("Using factory address:", factoryV1Address);
      console.log("User address:", userAddress);

      // Check V1 Factory
      const factoryV1 = new Contract(factoryV1Address, TokenFactoryV1.abi, provider);
      
      // Verify contract code exists
      const code = await provider.getCode(factoryV1Address);
      if (code === '0x') {
        showToast('error', 'Factory contract not found at specified address');
        return;
      }

      try {
        const factoryWithSigner = factoryV1.connect(signer) as Contract;
        
        // Try to get user's tokens first
        try {
          console.log("Attempting to get tokens by user...");
          const userTokens = await factoryWithSigner.getTokensByUser(userAddress, { gasLimit: 500000 });
          console.log("User tokens:", userTokens);
          
          if (userTokens && userTokens.length > 0) {
            const tokenPromises = userTokens.map(async (tokenAddr: string) => {
              try {
                console.log("Checking token:", tokenAddr);
                const token = new Contract(tokenAddr, TokenTemplateV1.abi, provider);
                const [name, symbol, totalSupply, blacklistEnabled, timeLockEnabled] = await Promise.all([
                  token.name(),
                  token.symbol(),
                  token.totalSupply(),
                  token.blacklistEnabled(),
                  token.timeLockEnabled()
                ]);

                console.log("Token info retrieved:", {
                  address: tokenAddr,
                  name,
                  symbol,
                  totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                  blacklistEnabled,
                  timeLockEnabled
                });

                return {
                  address: tokenAddr,
                  name,
                  symbol,
                  totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                  blacklistEnabled,
                  timeLockEnabled
                };
              } catch (error) {
                console.log(`Error checking token ${tokenAddr}:`, error);
                return null;
              }
            });
            const tokenResults = await Promise.all(tokenPromises);
            const validTokens = tokenResults.filter(Boolean);
            console.log("Valid tokens found:", validTokens);
            
            if (validTokens.length > 0) {
              setTokens(validTokens as TokenInfo[]);
              return;
            }
          } else {
            console.log("No user tokens found, trying deployedTokens...");
          }
        } catch (error) {
          console.log("getTokensByUser failed:", error);
          console.log("Trying deployedTokens...");
        }

        // Try to get all deployed tokens if getTokensByUser fails
        try {
          console.log("Attempting to get all deployed tokens...");
          const deployedTokens = await factoryWithSigner.deployedTokens();
          console.log("Found deployedTokens:", deployedTokens);
          
          if (deployedTokens && deployedTokens.length > 0) {
            const tokenPromises = deployedTokens.map(async (tokenAddr: string) => {
              try {
                const token = new Contract(tokenAddr, TokenTemplateV1.abi, provider);
                const [name, symbol, totalSupply, blacklistEnabled, timeLockEnabled] = await Promise.all([
                  token.name(),
                  token.symbol(),
                  token.totalSupply(),
                  token.blacklistEnabled(),
                  token.timeLockEnabled()
                ]);

                return {
                  address: tokenAddr,
                  name,
                  symbol,
                  totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                  blacklistEnabled,
                  timeLockEnabled
                };
              } catch (error) {
                console.log(`Error checking token ${tokenAddr}:`, error);
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
          console.log("deployedTokens failed, trying event logs...");
        }

        // Fallback to event logs with much wider range
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 2500000);

        console.log(`\nSearching for events from block ${fromBlock} to ${currentBlock}`);

        // Try all possible event signatures
        const signatures = [
          "TokenCreated(address,string,string)",
          "TokenDeployed(address,string,string)",
          "TokenCreated(address,string,string,address)",
          "TokenCreated(address,string,string,uint256)",
          "TokenCreated(address,string,string,uint8)",
          "TokenCreated(address,string,string,uint8,uint256)",
          "TokenCreated(address,address,string,string)",
          "TokenCreated(address,string,string,address,uint256,uint256,bool,bool)",
          "TokenDeployed(address,address,string,string,uint8,uint256)",
          "TokenDeployed(address,string,string,address,uint256,uint256,bool,bool)"
        ];

        const foundTokens: TokenInfo[] = [];
        const processedAddresses = new Set<string>();

        for (const signature of signatures) {
          try {
            const topicHash = ethers.id(signature);
            const filter = {
              address: factoryV1Address,
              fromBlock,
              toBlock: currentBlock,
              topics: [topicHash]
            };

            const logs = await provider.getLogs(filter);
            
            for (const log of logs) {
              try {
                if (signature === "TokenCreated(address,string,string)") {
                  const abiCoder = new AbiCoder();
                  try {
                    const [tokenAddr, name, symbol] = abiCoder.decode(
                      ['address', 'string', 'string'],
                      log.data
                    );

                    if (!tokenAddr || !ethers.isAddress(tokenAddr)) continue;

                    const normalizedAddr = tokenAddr.toLowerCase();
                    if (processedAddresses.has(normalizedAddr)) continue;

                    const code = await provider.getCode(normalizedAddr);
                    if (code === '0x') continue;

                    const token = new Contract(normalizedAddr, TokenTemplateV1.abi, provider);
                    const [actualName, actualSymbol, totalSupply, blacklistEnabled, timeLockEnabled] = await Promise.all([
                      token.name().catch(() => name),
                      token.symbol().catch(() => symbol),
                      token.totalSupply().catch(() => BigInt(0)),
                      token.blacklistEnabled().catch(() => false),
                      token.timeLockEnabled().catch(() => false)
                    ]);

                    if (!foundTokens.some(t => t.address.toLowerCase() === normalizedAddr)) {
                      foundTokens.push({
                        address: normalizedAddr,
                        name: actualName,
                        symbol: actualSymbol,
                        totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                        blacklistEnabled,
                        timeLockEnabled
                      });
                      processedAddresses.add(normalizedAddr);
                    }
                  } catch (error) {
                    console.error("Error decoding event data:", error);
                  }
                  continue;
                }

                // Try all possible argument positions for token address
                const possibleAddresses = log.topics
                  .slice(1)
                  .map(topic => '0x' + topic.slice(-40).toLowerCase())
                  .filter(addr => addr.startsWith('0x') && addr.length === 42);

                const data = log.data.slice(2);
                for (let i = 0; i < data.length - 40; i += 64) {
                  const potentialAddr = '0x' + data.slice(i + 24, i + 64).toLowerCase();
                  if (potentialAddr.startsWith('0x') && potentialAddr.length === 42) {
                    possibleAddresses.push(potentialAddr);
                  }
                }

                for (const addr of possibleAddresses) {
                  if (processedAddresses.has(addr)) continue;
                  
                  try {
                    const code = await provider.getCode(addr);
                    if (code === '0x') continue;

                    const token = new Contract(addr, TokenTemplateV1.abi, provider);
                    const [name, symbol, totalSupply, blacklistEnabled, timeLockEnabled] = await Promise.all([
                      token.name(),
                      token.symbol(),
                      token.totalSupply(),
                      token.blacklistEnabled(),
                      token.timeLockEnabled()
                    ]);

                    if (!foundTokens.some(t => t.address.toLowerCase() === addr.toLowerCase())) {
                      foundTokens.push({
                        address: addr,
                        name,
                        symbol,
                        totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                        blacklistEnabled,
                        timeLockEnabled
                      });
                      processedAddresses.add(addr);
                    }
                  } catch (error) {
                    continue;
                  }
                }
              } catch (error) {
                console.error("Error parsing log:", error);
              }
            }
          } catch (error) {
            console.error(`Error searching events with signature ${signature}:`, error);
          }
        }

        if (foundTokens.length > 0) {
          setTokens(foundTokens);
        }
      } catch (error: any) {
        console.error("Token retrieval failed:", error);
        showToast('error', error.message || 'Failed to load tokens');
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
      <div className="p-1 bg-gray-800 rounded-lg shadow-lg">
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
        <button className="text-text-accent hover:text-blue-400">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      
      {toast && <Toast type={toast.type} message={toast.message} />}
      
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
                                className="flex-1 p-2 rounded bg-background-primary border border-border hover:border-border-light focus:border-text-accent text-text-primary placeholder-text-secondary"
                              />
                              <button
                                onClick={() => handleBlacklist(token.address, blacklistAddress, true)}
                                className="px-3 py-1 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30"
                              >
                                Blacklist
                              </button>
                              <button
                                onClick={() => handleBlacklist(token.address, blacklistAddress, false)}
                                className="px-3 py-1 rounded bg-green-500/20 text-green-500 hover:bg-green-500/30"
                              >
                                Unblacklist
                              </button>
                            </div>
                          </div>
                        )}

                        {token.timeLockEnabled && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-text-primary">Time Lock Management</h4>
                            <p className="text-sm text-text-secondary mb-2">Lock token transfers for a specific address for a set duration.</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={lockInfo.address}
                                onChange={(e) => setLockInfo({ ...lockInfo, address: e.target.value })}
                                placeholder="Address to lock/check"
                                className="flex-1 p-2 rounded bg-background-primary border border-border hover:border-border-light focus:border-text-accent text-text-primary placeholder-text-secondary"
                              />
                              <input
                                type="number"
                                value={lockInfo.duration}
                                onChange={(e) => setLockInfo({ ...lockInfo, duration: parseInt(e.target.value) || 0 })}
                                min="1"
                                max="365"
                                placeholder="Days"
                                className="w-24 p-2 rounded bg-background-primary border border-border hover:border-border-light focus:border-text-accent text-text-primary"
                              />
                              <button
                                onClick={() => handleSetLockTime(token.address, lockInfo.address, lockInfo.duration)}
                                className="px-3 py-1 rounded bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                              >
                                Lock
                              </button>
                              <button
                                onClick={() => checkLockTime(token.address, lockInfo.address)}
                                className="px-3 py-1 rounded bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
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