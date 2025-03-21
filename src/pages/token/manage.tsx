import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast/use-toast';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import Head from 'next/head';
import { Footer } from '@/components/layouts/Footer';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from '@/components/ui/Spinner';

// Helper function to get explorer URL since we don't have direct access to the utility
function getExplorerUrl(chainId: number, address: string, type: string = 'address'): string {
  // Default to Etherscan
  let baseUrl = 'https://etherscan.io';
  
  // Check for specific networks
  if (chainId === 80002) {
    // Polygon Amoy
    baseUrl = 'https://www.oklink.com/amoy';
  } else if (chainId === 11155111) {
    // Sepolia
    baseUrl = 'https://sepolia.etherscan.io';
  } else if (chainId === 421614) {
    // Arbitrum Sepolia
    baseUrl = 'https://sepolia-explorer.arbitrum.io';
  } else if (chainId === 11155420) {
    // Optimism Sepolia
    baseUrl = 'https://sepolia-optimism.etherscan.io';
  } else if (chainId === 97) {
    // BSC Testnet
    baseUrl = 'https://testnet.bscscan.com';
  } else if (chainId === 56) {
    // BSC Mainnet
    baseUrl = 'https://bscscan.com';
  }
  
  if (type === 'token') {
    return `${baseUrl}/token/${address}`;
  }
  
  return `${baseUrl}/${type}/${address}`;
}

export default function TokenManagePage() {
  const router = useRouter();
  const { address, network, name, symbol } = router.query;
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<any>(null);
  
  useEffect(() => {
    // Wait for router query to be populated
    if (!router.isReady) return;
    
    const loadTokenData = async () => {
      setLoading(true);
      
      try {
        if (!address || !network) {
          throw new Error('Token address or network not provided');
        }
        
        // Initialize provider
        if (!window.ethereum) {
          throw new Error('No Ethereum provider found. Please install a wallet like MetaMask.');
        }
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const networkId = parseInt(network as string);
        
        // Basic ERC20 interface
        const tokenContract = new ethers.Contract(
          address as string,
          [
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)',
            'function totalSupply() view returns (uint256)',
            'function balanceOf(address) view returns (uint256)',
            'function owner() view returns (address)',
            'function paused() view returns (bool)',
            'function antiDumpEnabled() view returns (bool)',
            'function maxTxAmount() view returns (uint256)',
            'function maxWalletAmount() view returns (uint256)',
            'function buyTaxRate() view returns (uint256)',
            'function sellTaxRate() view returns (uint256)',
            'function dynamicTaxEnabled() view returns (bool)'
          ],
          provider
        );
        
        // Fetch basic token info
        const [
          tokenName,
          tokenSymbol,
          decimals,
          totalSupply,
          ownerAddress,
          paused,
          antiDumpEnabled,
          maxTxAmount,
          maxWalletAmount,
          buyTaxRate,
          sellTaxRate,
          dynamicTaxEnabled
        ] = await Promise.all([
          // Try to use provided name/symbol first, fall back to contract calls
          name || tokenContract.name(),
          symbol || tokenContract.symbol(),
          tokenContract.decimals().catch(() => 18),
          tokenContract.totalSupply(),
          tokenContract.owner().catch(() => null),
          tokenContract.paused().catch(() => false),
          tokenContract.antiDumpEnabled().catch(() => false),
          tokenContract.maxTxAmount().catch(() => BigInt(0)),
          tokenContract.maxWalletAmount().catch(() => BigInt(0)),
          tokenContract.buyTaxRate().catch(() => BigInt(0)),
          tokenContract.sellTaxRate().catch(() => BigInt(0)),
          tokenContract.dynamicTaxEnabled().catch(() => false)
        ]);
        
        // Format data
        setTokenData({
          address: address as string,
          name: tokenName,
          symbol: tokenSymbol,
          decimals: decimals,
          totalSupply: ethers.formatUnits(totalSupply, decimals),
          owner: ownerAddress,
          paused: paused,
          antiDumpEnabled: antiDumpEnabled,
          maxTxAmount: maxTxAmount ? ethers.formatUnits(maxTxAmount, decimals) : "0",
          maxWalletAmount: maxWalletAmount ? ethers.formatUnits(maxWalletAmount, decimals) : "0",
          buyTaxRate: buyTaxRate ? Number(buyTaxRate) / 100 : 0,
          sellTaxRate: sellTaxRate ? Number(sellTaxRate) / 100 : 0,
          dynamicTaxEnabled: dynamicTaxEnabled,
          networkId: networkId
        });
        
      } catch (error) {
        console.error('Error loading token data:', error);
        toast({
          title: 'Error',
          description: `Failed to load token data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadTokenData();
  }, [router.isReady, address, network, name, symbol, toast]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>{tokenData?.name || 'Token'} Management | Token Factory</title>
        <meta name="description" content="Manage your token settings and features" />
      </Head>
      
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link href="/v4" className="text-blue-500 hover:text-blue-400">
              &larr; Back to Dashboard
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spinner className="h-8 w-8 mr-2" />
              <span className="text-white">Loading token data...</span>
            </div>
          ) : !tokenData ? (
            <Card className="p-6 bg-red-900/20 border border-red-800/30">
              <h2 className="text-xl font-semibold text-white mb-2">Token Not Found</h2>
              <p className="text-gray-300">
                Could not load the requested token information. Please check the token address and network.
              </p>
              <Link href="/v4">
                <Button className="mt-4">Return to Dashboard</Button>
              </Link>
            </Card>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white">{tokenData.name}</h1>
                <div className="flex items-center mt-2 space-x-3">
                  <Badge variant="outline" className="text-white border-gray-600 px-3 py-0.5">
                    {tokenData.symbol}
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
                    V4
                  </Badge>
                  {tokenData.paused && (
                    <Badge variant="destructive">Paused</Badge>
                  )}
                </div>
              </div>
              
              <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-6">
                <Card className="p-4 bg-gray-800/50 border border-gray-700/50">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Total Supply</h3>
                  <p className="text-xl font-bold text-white">{Number(tokenData.totalSupply).toLocaleString()} {tokenData.symbol}</p>
                </Card>
                
                <Card className="p-4 bg-gray-800/50 border border-gray-700/50">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Address</h3>
                  <div className="flex items-center">
                    <p className="text-sm font-mono text-white truncate">{tokenData.address}</p>
                    <Button 
                      variant="ghost" 
                      className="ml-2 h-6 w-6 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(tokenData.address);
                        toast({
                          title: "Address Copied",
                          description: "Token address copied to clipboard"
                        });
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </Button>
                  </div>
                </Card>
                
                <Card className="p-4 bg-gray-800/50 border border-gray-700/50">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Owner</h3>
                  <p className="text-sm font-mono text-white truncate">{tokenData.owner || 'Unknown'}</p>
                </Card>
              </div>
              
              <Tabs defaultValue="overview" className="mb-10">
                <TabsList className="mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tokenomics">Tokenomics</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="holders">Holders</TabsTrigger>
                  <TabsTrigger value="admin">Admin Controls</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
                    <h2 className="text-xl font-bold text-white mb-4">Token Overview</h2>
                    
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Basic Information</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Name:</span>
                            <span className="text-white font-medium">{tokenData.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Symbol:</span>
                            <span className="text-white font-medium">{tokenData.symbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Decimals:</span>
                            <span className="text-white font-medium">{tokenData.decimals}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Supply:</span>
                            <span className="text-white font-medium">{Number(tokenData.totalSupply).toLocaleString()} {tokenData.symbol}</span>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <Button 
                            className="w-full"
                            onClick={() => {
                              const explorerUrl = getExplorerUrl(tokenData.networkId, tokenData.address, 'token');
                              window.open(explorerUrl, '_blank');
                            }}
                          >
                            View on Explorer
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Status</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Network:</span>
                            <span className="text-white font-medium">
                              {tokenData.networkId === 80002 ? 'Polygon Amoy' : `Chain ID: ${tokenData.networkId}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className={`font-medium ${tokenData.paused ? 'text-red-400' : 'text-green-400'}`}>
                              {tokenData.paused ? 'Paused' : 'Active'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Anti-Dump:</span>
                            <span className={`font-medium ${tokenData.antiDumpEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                              {tokenData.antiDumpEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
                
                <TabsContent value="tokenomics" className="space-y-6">
                  <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
                    <h2 className="text-xl font-bold text-white mb-4">Tokenomics</h2>
                    
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Tax Configuration</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Buy Tax:</span>
                            <span className="text-white font-medium">{tokenData.buyTaxRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Sell Tax:</span>
                            <span className="text-white font-medium">{tokenData.sellTaxRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Dynamic Tax:</span>
                            <span className={`font-medium ${tokenData.dynamicTaxEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                              {tokenData.dynamicTaxEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Transaction Limits</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Max Transaction:</span>
                            <span className="text-white font-medium">
                              {Number(tokenData.maxTxAmount) > 0 
                                ? `${Number(tokenData.maxTxAmount).toLocaleString()} ${tokenData.symbol}` 
                                : 'No Limit'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Max Wallet:</span>
                            <span className="text-white font-medium">
                              {Number(tokenData.maxWalletAmount) > 0 
                                ? `${Number(tokenData.maxWalletAmount).toLocaleString()} ${tokenData.symbol}` 
                                : 'No Limit'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
                
                <TabsContent value="transactions" className="space-y-6">
                  <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
                    <h2 className="text-xl font-bold text-white mb-4">Recent Transactions</h2>
                    <p className="text-gray-400">
                      Transaction history will be available in a future update.
                    </p>
                  </Card>
                </TabsContent>
                
                <TabsContent value="holders" className="space-y-6">
                  <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
                    <h2 className="text-xl font-bold text-white mb-4">Token Holders</h2>
                    <p className="text-gray-400">
                      Holder information will be available in a future update.
                    </p>
                  </Card>
                </TabsContent>
                
                <TabsContent value="admin" className="space-y-6">
                  <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
                    <h2 className="text-xl font-bold text-white mb-4">Admin Controls</h2>
                    
                    {!isConnected ? (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                        <p className="text-yellow-400">
                          Please connect your wallet to access admin controls.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Token Controls</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button variant="secondary">
                              {tokenData.paused ? 'Unpause Token' : 'Pause Token'}
                            </Button>
                            <Button variant="secondary">Mint Tokens</Button>
                            <Button variant="secondary">Burn Tokens</Button>
                            <Button variant="secondary">Transfer Ownership</Button>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Tax Configuration</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button variant="secondary">Adjust Buy Tax</Button>
                            <Button variant="secondary">Adjust Sell Tax</Button>
                            <Button variant="secondary">
                              {tokenData.dynamicTaxEnabled ? 'Disable Dynamic Tax' : 'Enable Dynamic Tax'}
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Security Controls</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button variant="secondary">Manage Blacklist</Button>
                            <Button variant="secondary">Adjust Transaction Limits</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 