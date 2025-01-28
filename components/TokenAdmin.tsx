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
        
        // Try to get tokens using deployedTokens array first
        try {
          const deployedTokens = await factoryWithSigner.deployedTokens();
          console.log("Found deployedTokens:", deployedTokens);
          
          if (deployedTokens && deployedTokens.length > 0) {
            // Filter tokens owned by user
            const tokenPromises = deployedTokens.map(async (tokenAddr: string) => {
              try {
                const token = new Contract(tokenAddr, TokenTemplateV1.abi, provider);
                const owner = await token.owner();
                return owner.toLowerCase() === userAddress.toLowerCase() ? tokenAddr : null;
              } catch (error) {
                console.log(`Error checking token ${tokenAddr}:`, error);
                return null;
              }
            });
            const tokenResults = await Promise.all(tokenPromises);
            v1Tokens = tokenResults.filter(Boolean);
            console.log("Found user tokens from deployedTokens:", v1Tokens);
          }
        } catch (error) {
          console.log("deployedTokens failed, trying userTokens...");
          try {
            // Then try userTokens mapping
            v1Tokens = await factoryWithSigner.userTokens(userAddress);
            console.log("Found tokens from userTokens:", v1Tokens);
          } catch (error) {
            console.log("userTokens failed, trying getTokensByUser...");
            try {
              // Finally try getTokensByUser method
              v1Tokens = await factoryWithSigner.getTokensByUser(userAddress, {
                gasLimit: 1000000 // Increased gas limit
              });
              console.log("Found tokens from getTokensByUser:", v1Tokens);
            } catch (error) {
              console.error("All direct token retrieval methods failed");
            }
          }
        }
      } catch (error: any) {
        console.error("V1 token retrieval failed:", {
          error,
          errorName: error.name,
          errorCode: error.code,
          errorMessage: error.message,
          errorData: error.data,
          transaction: error.transaction
        });

        // Fallback to event logs with much wider range
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 100000); // Search last 100k blocks

        console.log(`\nSearching for events from block ${fromBlock} to ${currentBlock}`);

        // Try both event signatures
        const signatures = [
          "TokenCreated(address,string,string,address,uint256,uint256,bool,bool)",
          "TokenCreated(address,address,string,string,uint8,uint256)"
        ];

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
                console.log("\nRaw log:", log);
                const parsedLog = factoryV1.interface.parseLog(log);
                if (parsedLog) {
                  console.log("Parsed log:", {
                    name: parsedLog.name,
                    args: parsedLog.args
                  });

                  // Extract creator and token address based on event format
                  let creator, tokenAddr;
                  if (signature.includes("bool,bool")) {
                    // New format
                    creator = parsedLog.args[0];
                    tokenAddr = parsedLog.args[3];
                  } else {
                    // Old format
                    creator = parsedLog.args[0];
                    tokenAddr = parsedLog.args[1];
                  }

                  if (creator && tokenAddr && creator.toLowerCase() === userAddress.toLowerCase()) {
                    if (!v1Tokens.includes(tokenAddr)) {
                      console.log(`Found token created by user: ${tokenAddr}`);
                      v1Tokens.push(tokenAddr);
                    }
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
      }

      // Get token info for V1 tokens
      const tokenInfoPromises = v1Tokens.map(async (tokenAddress) => {
        try {
          const token = new Contract(tokenAddress, TokenTemplateV1.abi, provider);
          
          // Verify token contract exists
          const tokenCode = await provider.getCode(tokenAddress);
          if (tokenCode === '0x') {
            console.error(`No contract found at token address: ${tokenAddress}`);
            return null;
          }

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
            version: 'v1' as const,
            lastActivity: Date.now()
          };
        } catch (error) {
          console.error(`Error getting info for token ${tokenAddress}:`, error);
          return null;
        }
      });

      const tokenInfos = (await Promise.all(tokenInfoPromises)).filter(Boolean);
      setTokens(tokenInfos as TokenInfo[]);
    } catch (error: any) {
      console.error('Error loading tokens:', error);
      showToast('error', error.message || 'Failed to load tokens');
    } finally {
      setIsLoading(false);
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

  const filteredAndSortedTokens = tokens
    .filter(token => {
      if (filterVersion !== 'all' && token.version !== filterVersion) return false;
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-background-accent p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-text-secondary">Total Tokens</h3>
            <p className="text-2xl font-bold text-text-primary">{stats.totalTokens}</p>
          </div>
          <div className="bg-background-accent p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-text-secondary">V1 Tokens</h3>
            <p className="text-2xl font-bold text-text-primary">{stats.v1Tokens}</p>
          </div>
          <div className="bg-background-accent p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-text-secondary">V2 Tokens</h3>
            <p className="text-2xl font-bold text-text-primary">{stats.v2Tokens}</p>
          </div>
          <div className="bg-background-accent p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-text-secondary">Total Supply</h3>
            <p className="text-2xl font-bold text-text-primary">{stats.totalValue}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-background-accent p-4 rounded-lg">
          <input
            type="text"
            placeholder="Search tokens..."
            className="flex-1 px-4 py-2 rounded border border-border bg-background-secondary text-text-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="px-4 py-2 rounded border border-border bg-background-secondary text-text-primary"
            value={filterVersion}
            onChange={(e) => setFilterVersion(e.target.value as 'all' | 'v1' | 'v2')}
          >
            <option value="all">All Versions</option>
            <option value="v1">Version 1</option>
            <option value="v2">Version 2</option>
          </select>
          <select
            className="px-4 py-2 rounded border border-border bg-background-secondary text-text-primary"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'totalSupply' | 'lastActivity')}
          >
            <option value="lastActivity">Last Activity</option>
            <option value="name">Name</option>
            <option value="totalSupply">Total Supply</option>
          </select>
          <button
            className="px-4 py-2 rounded bg-background-secondary hover:bg-opacity-80 text-text-primary"
            onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Token List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner className="w-8 h-8 text-text-primary" />
          </div>
        ) : filteredAndSortedTokens.length === 0 ? (
          <div className="bg-background-accent p-8 rounded-lg text-center">
            <p className="text-text-secondary text-lg">No tokens found</p>
            <p className="text-text-secondary mt-2">Deploy a new token to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedTokens.map(token => (
              <div 
                key={token.address}
                className="bg-background-accent p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-text-primary">{token.name}</h3>
                    <p className="text-sm text-text-accent">{token.symbol}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    token.version === 'v2' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {token.version.toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Supply</span>
                    <span className="text-text-primary font-medium">
                      {Number(token.totalSupply).toLocaleString()} {token.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Owner</span>
                    <span className="text-text-primary font-medium">
                      {token.owner.slice(0, 6)}...{token.owner.slice(-4)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <button
                    onClick={() => setSelectedToken(token.address)}
                    className="text-text-accent hover:text-opacity-80 text-sm"
                  >
                    View Details
                  </button>
                  <a
                    href={getExplorerUrl(chainId || 0, `/token/${token.address}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-accent hover:text-opacity-80 text-sm"
                  >
                    Explorer ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 