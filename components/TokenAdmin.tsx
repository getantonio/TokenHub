import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, BlockTag } from 'ethers';
import TokenFactoryV1 from '../contracts/abi/TokenFactory_v1.json';
import TokenFactoryV2 from '../contracts/abi/TokenFactory_v2.json';
import TokenTemplateV1 from '../contracts/abi/TokenTemplate_v1.json';
import TokenTemplateV2 from '../contracts/abi/TokenTemplate_v2.json';
import { getNetworkContractAddress } from '../config/contracts';
import { getExplorerUrl } from '../config/networks';
import { useNetwork } from '../contexts/NetworkContext';
import { Toast } from './ui/Toast';
import { Spinner } from './ui/Spinner';
import { ethers } from 'ethers';
import { AbiCoder } from 'ethers';

const TOKEN_DECIMALS = 18; // Standard ERC20 decimals
const TEST_TOKEN_ADDRESS = '0x376e0B2A973f4ec5a7fB121865212E03cB4b7cA6'; // The token you just deployed

interface TokenAdminProps {
  isConnected: boolean;
  address?: string;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  owner: string;
  version: 'v1' | 'v2';
  lastActivity?: number;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

interface TokenStats {
  totalTokens: number;
  v1Tokens: number;
  v2Tokens: number;
  totalValue: string;
}

export default function TokenAdmin({ isConnected, address }: TokenAdminProps) {
  const { chainId } = useNetwork();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVersion, setFilterVersion] = useState<'all' | 'v1' | 'v2'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'totalSupply' | 'lastActivity'>('lastActivity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [filterByWallet, setFilterByWallet] = useState(false);
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());

  // Initialize provider when component mounts or wallet connection changes
  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum && isConnected) {
        try {
          const newProvider = new BrowserProvider(window.ethereum);
          setProvider(newProvider);
          return newProvider;
        } catch (error) {
          console.error("Error initializing provider:", error);
        }
      }
      return null;
    };

    initProvider();
  }, [isConnected]);

  // Load tokens when dependencies are available
  useEffect(() => {
    const init = async () => {
      if (isConnected && chainId && window.ethereum && provider) {
        try {
          await loadTokens();
        } catch (error) {
          console.error("Error in init:", error);
        }
      } else {
        console.log("Missing dependencies:", {
          isConnected,
          chainId,
          hasEthereum: !!window.ethereum,
          hasProvider: !!provider
        });
      }
    };

    init();
  }, [isConnected, chainId, provider, address]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({
      type,
      message
    });
    setTimeout(() => setToast(null), 15000);
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

      let v1Tokens: string[] = [];

      // Check V1 Factory
      const factoryV1 = new Contract(factoryV1Address, TokenFactoryV1.abi, provider);
      
      // Verify contract code exists
      const code = await provider.getCode(factoryV1Address);
      if (code === '0x') {
        showToast('error', 'Factory contract not found at specified address');
        return;
      }

      // Try getTokensByUser with increased gas limit
      try {
        const factoryWithSigner = factoryV1.connect(signer) as Contract;
        
        // Try to get all deployed tokens first
        try {
          const deployedTokens = await factoryWithSigner.deployedTokens();
          console.log("Found deployedTokens:", deployedTokens);
          
          if (deployedTokens && deployedTokens.length > 0) {
            // Get info for all tokens
            const tokenPromises = deployedTokens.map(async (tokenAddr: string) => {
              try {
                const token = new Contract(tokenAddr, TokenTemplateV1.abi, provider);
                const [name, symbol, totalSupply, owner] = await Promise.all([
                  token.name(),
                  token.symbol(),
                  token.totalSupply(),
                  token.owner()
                ]);
                return {
                  address: tokenAddr,
                  name,
                  symbol,
                  totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                  owner,
                  version: 'v1' as const,
                  lastActivity: Date.now()
                };
              } catch (error) {
                console.log(`Error checking token ${tokenAddr}:`, error);
                return null;
              }
            });
            const tokenResults = await Promise.all(tokenPromises);
            const validTokens = tokenResults.filter(Boolean);
            console.log("Found valid tokens:", validTokens);
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
        // Search from a much earlier block - approximately 1 year ago
        const fromBlock = Math.max(0, currentBlock - 2500000);

        console.log(`\nSearching for events from block ${fromBlock} to ${currentBlock}`);

        // Try all possible event signatures
        const signatures = [
          // V1 formats - try basic format first since we know it works
          "TokenCreated(address,string,string)", // Basic format that we know works
          // Try other formats only if the basic one doesn't work
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
            console.log(`\nTrying event signature: ${signature}`);
            console.log(`Topic hash: ${topicHash}`);

            const filter = {
              address: factoryV1Address,
              fromBlock,
              toBlock: currentBlock,
              topics: [topicHash]
            };

            const logs = await provider.getLogs(filter);
            console.log(`Found ${logs.length} logs for signature ${signature}`);
            
            for (const log of logs) {
              try {
                console.log("\nRaw log:", {
                  blockNumber: log.blockNumber,
                  transactionHash: log.transactionHash,
                  topics: log.topics,
                  data: log.data
                });

                // For TokenCreated(address,string,string) format
                if (signature === "TokenCreated(address,string,string)") {
                  // The data field contains the parameters packed together
                  const abiCoder = new AbiCoder();
                  try {
                    // Decode the entire data field
                    const [tokenAddr, name, symbol] = abiCoder.decode(
                      ['address', 'string', 'string'],
                      log.data
                    );

                    console.log("ABI Decoded data:", {
                      tokenAddr,
                      name,
                      symbol,
                      rawData: log.data
                    });

                    if (!tokenAddr || !ethers.isAddress(tokenAddr)) {
                      console.log("Invalid token address:", tokenAddr);
                      continue;
                    }

                    const normalizedAddr = tokenAddr.toLowerCase();
                    
                    if (processedAddresses.has(normalizedAddr)) {
                      console.log("Already processed address:", normalizedAddr);
                      continue;
                    }

                    // Verify it's a contract before proceeding
                    const code = await provider.getCode(normalizedAddr);
                    if (code === '0x') {
                      console.log(`No contract at ${normalizedAddr} - Code: ${code}`);
                      continue;
                    }

                    console.log("Contract verified at:", normalizedAddr);

                    // Try to interact with it as a token
                    const token = new Contract(normalizedAddr, TokenTemplateV1.abi, provider);
                    
                    // Get token info with proper error handling
                    const [actualName, actualSymbol, totalSupply, decimals, owner] = await Promise.all([
                      token.name().catch((e: Error) => {
                        console.error("Error getting name:", e);
                        return name;
                      }),
                      token.symbol().catch((e: Error) => {
                        console.error("Error getting symbol:", e);
                        return symbol;
                      }),
                      token.totalSupply().catch((e: Error) => {
                        console.error("Error getting totalSupply:", e);
                        return BigInt(0);
                      }),
                      token.decimals().catch((e: Error) => {
                        console.error("Error getting decimals:", e);
                        return 18;
                      }),
                      token.owner().catch((e: Error) => {
                        console.error("Error getting owner:", e);
                        return null;
                      })
                    ]);

                    console.log("Token info retrieved:", {
                      address: normalizedAddr,
                      name: actualName,
                      symbol: actualSymbol,
                      totalSupply: totalSupply.toString(),
                      decimals,
                      owner
                    });

                    // Add to list if not already present
                    if (!foundTokens.some(t => t.address.toLowerCase() === normalizedAddr)) {
                      foundTokens.push({
                        address: normalizedAddr,
                        name: actualName,
                        symbol: actualSymbol,
                        totalSupply: formatUnits(totalSupply, decimals),
                        owner,
                        version: 'v1' as const,
                        lastActivity: Date.now()
                      });
                      processedAddresses.add(normalizedAddr);
                    }
                  } catch (error) {
                    console.error("Error decoding event data:", error);
                    console.log("Raw log that failed decoding:", {
                      data: log.data,
                      topics: log.topics,
                      blockNumber: log.blockNumber,
                      transactionHash: log.transactionHash
                    });
                  }
                  continue;
                }

                // Try all possible argument positions for token address
                const possibleAddresses = log.topics
                  .slice(1)  // Skip the event signature topic
                  .map(topic => {
                    // Extract address from the last 40 characters of the topic
                    const addr = '0x' + topic.slice(-40).toLowerCase();
                    console.log("Extracted address from topic:", addr);
                    return addr;
                  })
                  .filter(addr => addr.startsWith('0x') && addr.length === 42);

                // Also check data field for addresses
                const data = log.data.slice(2); // Remove 0x prefix
                for (let i = 0; i < data.length - 40; i += 64) {
                  const potentialAddr = '0x' + data.slice(i + 24, i + 64).toLowerCase();
                  if (potentialAddr.startsWith('0x') && potentialAddr.length === 42) {
                    console.log("Extracted address from data:", potentialAddr);
                    possibleAddresses.push(potentialAddr);
                  }
                }

                console.log("All possible addresses:", possibleAddresses);

                for (const addr of possibleAddresses) {
                  if (processedAddresses.has(addr)) {
                    console.log("Already processed address:", addr);
                    continue;
                  }
                  
                  try {
                    // Verify it's a contract
                    const code = await provider.getCode(addr);
                    if (code === '0x') {
                      console.log("No contract code at:", addr);
                      continue;
                    }

                    console.log("Found contract at:", addr);
                    
                    // Create token contract instance
                    const token = new Contract(addr, TokenTemplateV1.abi, provider);
                    
                    // Get token info
                    const [name, symbol, totalSupply, decimals] = await Promise.all([
                      token.name(),
                      token.symbol(),
                      token.totalSupply(),
                      token.decimals()
                    ]);

                    console.log("Token info:", {
                      address: addr,
                      name,
                      symbol,
                      totalSupply: formatUnits(totalSupply, decimals),
                    });

                    // Add to list if not already present
                    if (!foundTokens.some(t => t.address.toLowerCase() === addr.toLowerCase())) {
                      foundTokens.push({
                        address: addr,
                        name,
                        symbol,
                        totalSupply: formatUnits(totalSupply, decimals),
                        owner: await token.owner().catch(() => null),
                        version: 'v1' as const,
                        lastActivity: Date.now()
                      });
                    }

                    processedAddresses.add(addr);
                  } catch (error) {
                    console.log("Error processing token at", addr, error);
                    continue;
                  }
                }
              } catch (error) {
                console.error("Error parsing log:", error);
                console.log("Raw log that failed parsing:", log);
              }
            }
          } catch (error) {
            console.error(`Error searching events with signature ${signature}:`, error);
          }
        }

        if (foundTokens.length > 0) {
          console.log("Found tokens from events:", foundTokens);
          setTokens(foundTokens);
        }
      } catch (error: any) {
        console.error("Token retrieval failed:", error);
        showToast('error', error.message || 'Failed to load tokens');
      } finally {
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Error loading tokens:', error);
      showToast('error', error.message || 'Failed to load tokens');
    }
  };

  // Keep this function ready for when V2 is working
  const addV2TokensToList = async (v2Tokens: string[]) => {
    const v2TokenInfos = await Promise.all(
      v2Tokens.map(async (tokenAddress) => {
        try {
          const token = new Contract(tokenAddress, TokenTemplateV2.abi, provider);
          const [name, symbol, totalSupply, owner] = await Promise.all([
            token.name(),
            token.symbol(),
            token.totalSupply(),
            token.owner()
          ]);

          return {
            address: tokenAddress,
            name,
            symbol,
            totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
            owner,
            version: 'v2' as const,
            lastActivity: Date.now()
          };
        } catch (error) {
          console.error(`Error getting info for V2 token ${tokenAddress}:`, error);
          return null;
        }
      })
    );

    const validV2Tokens = v2TokenInfos.filter(Boolean) as TokenInfo[];
    setTokens(prevTokens => [...prevTokens, ...validV2Tokens]);
  };

  const stats: TokenStats = {
    totalTokens: tokens.length,
    v1Tokens: tokens.filter(t => t.version === 'v1').length,
    v2Tokens: tokens.filter(t => t.version === 'v2').length,
    totalValue: tokens.reduce((acc, t) => acc + Number(t.totalSupply), 0).toLocaleString()
  };

  const toggleTokenExpansion = (address: string) => {
    setExpandedTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  };

  const filteredAndSortedTokens = tokens
    .filter(token => {
      // Apply all filters
      if (filterVersion !== 'all' && token.version !== filterVersion) return false;
      if (filterByWallet && token.owner?.toLowerCase() !== address?.toLowerCase()) return false;
      if (searchTerm && !token.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !token.address.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'name':
          return direction * a.name.localeCompare(b.name);
        case 'totalSupply':
          return direction * (Number(a.totalSupply) - Number(b.totalSupply));
        case 'lastActivity':
          return direction * ((a.lastActivity || 0) - (b.lastActivity || 0));
        default:
          return 0;
      }
    });

  const testTokenDetection = async () => {
    if (!provider || !address) {
      console.log("Provider or address not available");
      return;
    }

    console.log("=== Starting Token Detection Test ===");
    console.log("User address:", address);
    
    try {
      // 1. Test direct token contract
      console.log("\n1. Testing direct token contract access...");
      try {
        const token = new Contract(TEST_TOKEN_ADDRESS, TokenTemplateV1.abi, provider);
        console.log("Successfully created token contract instance");
        
        const [name, symbol, totalSupply, owner] = await Promise.all([
          token.name(),
          token.symbol(),
          token.totalSupply(),
          token.owner()
        ]);
        
        const tokenInfo = {
          address: TEST_TOKEN_ADDRESS,
          name,
          symbol,
          totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
          owner
        };
        console.log("Token info:", JSON.stringify(tokenInfo, null, 2));
      } catch (error) {
        console.error("Error accessing token directly:", error);
      }

      // 2. Test V1 Factory
      console.log("\n2. Testing V1 Factory...");
      const factoryV1Address = getNetworkContractAddress(chainId!, 'factoryAddress');
      console.log("Factory V1 address:", factoryV1Address);
      
      if (factoryV1Address) {
        const factoryV1 = new Contract(factoryV1Address, TokenFactoryV1.abi, provider);
        console.log("Factory ABI methods:", Object.keys(factoryV1.interface.fragments));
        
        // Test getTokensByUser
        try {
          console.log("\n2.1 Testing getTokensByUser...");
          const signer = await provider.getSigner();
          const factoryWithSigner = factoryV1.connect(signer) as Contract;
          console.log("Calling getTokensByUser with address:", address);
          const tokens = await factoryWithSigner.getTokensByUser(address);
          console.log("getTokensByUser result:", tokens);
        } catch (error: any) {
          console.error("getTokensByUser error:", {
            message: error.message,
            code: error.code,
            data: error.data,
            transaction: error.transaction
          });
        }

        // Test events with multiple ranges
        try {
          console.log("\n2.2 Testing events...");
          const currentBlock = await provider.getBlockNumber();
          console.log("Current block:", currentBlock);

          // Get factory deployment block
          const code = await provider.getCode(factoryV1Address);
          console.log("Factory has code:", code !== '0x');

          // Focus on recent blocks for token creation
          const fromBlock = currentBlock - 100; // Just check last 100 blocks
          console.log(`\nSearching for token creation events from block ${fromBlock} to ${currentBlock}`);

          // Log the factory interface events to see what we're working with
          console.log("\nAvailable events in factory interface:");
          factoryV1.interface.forEachEvent((event) => {
            console.log("- Event:", event.name, "Signature:", event.format());
          });

          // Try the specific event signature we expect
          const eventSignature = "TokenCreated(address,string,string,address,uint256,uint256,bool,bool)";
          const eventTopic = ethers.id(eventSignature);
          console.log("\nEvent details:");
          console.log("Signature:", eventSignature);
          console.log("Topic hash:", eventTopic);

          const filter = {
            address: factoryV1Address,
            fromBlock: fromBlock,
            toBlock: currentBlock,
            topics: [eventTopic]
          };

          console.log("\nUsing filter:", JSON.stringify(filter, null, 2));
          const logs = await provider.getLogs(filter);
          console.log(`Found ${logs.length} logs`);

          if (logs.length > 0) {
            console.log("\nFound logs, attempting to parse...");
            for (const log of logs) {
              try {
                const parsedLog = factoryV1.interface.parseLog({
                  topics: log.topics,
                  data: log.data
                });
                
                if (parsedLog) {
                  console.log("\nParsed log details:");
                  console.log("Block number:", log.blockNumber);
                  console.log("Transaction hash:", log.transactionHash);
                  console.log("Event Name:", parsedLog.name);
                  console.log("Event Args:", {
                    creator: parsedLog.args[0],
                    name: parsedLog.args[1],
                    symbol: parsedLog.args[2],
                    tokenAddress: parsedLog.args[3],
                    param5: parsedLog.args[4]?.toString(),
                    param6: parsedLog.args[5]?.toString(),
                    param7: parsedLog.args[6],
                    param8: parsedLog.args[7]
                  });
                }
              } catch (error) {
                console.error("Error parsing log:", error);
                console.log("Raw log data:", {
                  blockNumber: log.blockNumber,
                  transactionHash: log.transactionHash,
                  data: log.data,
                  topics: log.topics
                });
              }
            }
          } else {
            console.log("\nTrying with a wider block range...");
            // Try with a wider range if no logs found
            const widerFilter = {
              ...filter,
              fromBlock: Math.max(0, currentBlock - 10000) // Search last 10,000 blocks
            };
            console.log(`\nSearching wider range from block ${widerFilter.fromBlock} to ${currentBlock}`);
            const moreLogs = await provider.getLogs(widerFilter);
            console.log(`Found ${moreLogs.length} logs in wider range`);
            
            if (moreLogs.length > 0) {
              for (const log of moreLogs) {
                try {
                  const parsedLog = factoryV1.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                  });
                  
                  if (parsedLog) {
                    console.log("\nParsed log details from wider range:");
                    console.log("Block number:", log.blockNumber);
                    console.log("Transaction hash:", log.transactionHash);
                    console.log("Event Name:", parsedLog.name);
                    console.log("Event Args:", {
                      creator: parsedLog.args[0],
                      name: parsedLog.args[1],
                      symbol: parsedLog.args[2],
                      tokenAddress: parsedLog.args[3],
                      param5: parsedLog.args[4]?.toString(),
                      param6: parsedLog.args[5]?.toString(),
                      param7: parsedLog.args[6],
                      param8: parsedLog.args[7]
                    });
                  }
                } catch (error) {
                  console.error("Error parsing log from wider range:", error);
                  console.log("Raw log data:", {
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    data: log.data,
                    topics: log.topics
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error("Event testing error:", error);
        }
      }

      console.log("\n=== Token Detection Test Complete ===");
    } catch (error) {
      console.error("Test failed:", error);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-6 bg-background-accent rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-6 text-text-primary">Token Dashboard</h2>
        <p className="text-text-secondary">Please connect your wallet to access your token dashboard.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {toast && (
        <div className={`mb-4 p-4 rounded-lg border ${
          toast.type === 'success' 
            ? 'bg-green-900/20 border-green-500 text-green-500' 
            : 'bg-red-900/20 border-red-500 text-red-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {toast.type === 'success' ? (
                <span className="text-green-500 mr-2">🎉</span>
              ) : (
                <span className="text-red-500 mr-2">⚠️</span>
              )}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-sm opacity-70 hover:opacity-100"
            >
              Clear Message
            </button>
          </div>
        </div>
      )}
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={testTokenDetection}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Token Detection
          </button>
        </div>

        {/* Controls Section */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-background-secondary p-4 rounded-lg">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 bg-background rounded border border-border focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <select
              value={filterVersion}
              onChange={(e) => setFilterVersion(e.target.value as 'all' | 'v1' | 'v2')}
              className="px-3 py-2 bg-background rounded border border-border focus:border-accent"
            >
              <option value="all">All Versions</option>
              <option value="v1">V1 Only</option>
              <option value="v2">V2 Only</option>
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filterByWallet}
                onChange={(e) => setFilterByWallet(e.target.checked)}
                className="form-checkbox"
              />
              <span>My Tokens Only</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('lastActivity')}
              className={`px-3 py-1 rounded ${sortBy === 'lastActivity' ? 'bg-accent text-white' : 'bg-background'}`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 rounded ${sortBy === 'name' ? 'bg-accent text-white' : 'bg-background'}`}
            >
              Name
            </button>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1 rounded bg-background"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <h4>Total Tokens</h4>
            <p>{stats.totalTokens}</p>
          </div>
          <div className="stat-card">
            <h4>V1 Tokens</h4>
            <p>{stats.v1Tokens}</p>
          </div>
          <div className="stat-card">
            <h4>V2 Tokens</h4>
            <p>{stats.v2Tokens}</p>
          </div>
          <div className="stat-card">
            <h4>Total Value</h4>
            <p>{stats.totalValue}</p>
          </div>
        </div>

        {/* Tokens List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : filteredAndSortedTokens.length === 0 ? (
            <div className="text-center p-8 text-text-secondary">
              No tokens found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedTokens.map(token => (
                <div key={token.address} className="bg-background-secondary rounded-lg overflow-hidden">
                  {/* Token Row Header - Always visible */}
                  <div className="p-4 flex items-center justify-between hover:bg-background-accent cursor-pointer"
                       onClick={() => toggleTokenExpansion(token.address)}>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-text-secondary">{token.version.toUpperCase()}</span>
                      <div>
                        <h3 className="font-medium">{token.name}</h3>
                        <p className="text-sm text-text-secondary">{token.symbol}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{Number(token.totalSupply).toLocaleString()}</p>
                        <p className="text-sm text-text-secondary">Supply</p>
                      </div>
                      <button className="text-text-accent">
                        {expandedTokens.has(token.address) ? '▼' : '▶'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Content */}
                  {expandedTokens.has(token.address) && (
                    <div className="p-4 border-t border-border bg-background/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-text-secondary">Contract Address</p>
                          <p className="font-mono text-sm">{token.address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-text-secondary">Owner</p>
                          <p className="font-mono text-sm">{token.owner}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-4">
                        <a
                          href={getExplorerUrl(chainId || 0, `/token/${token.address}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-accent hover:text-opacity-80 text-sm"
                        >
                          View on Explorer ↗
                        </a>
                        {token.owner?.toLowerCase() === address?.toLowerCase() && (
                          <button
                            onClick={() => setSelectedToken(token.address)}
                            className="text-text-accent hover:text-opacity-80 text-sm"
                          >
                            Manage Token
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 