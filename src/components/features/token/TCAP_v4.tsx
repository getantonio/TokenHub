import { useEffect, useState, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { ethers, Contract, BrowserProvider } from 'ethers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/toast/use-toast';
import { getNetworkContractAddress } from '@/config/contracts';
import { getExplorerUrl } from '@/config/networks';
import { shortenAddress } from '@/utils/address';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, ExternalLink, Settings, Eye, EyeOff } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Function to check if a chainId corresponds to Polygon Amoy network
function isPolygonAmoyNetwork(chainId: number): boolean {
  return chainId === 80002;
}

export interface TCAP_v4Props {
  isConnected: boolean;
  address?: string;
  provider: any;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  owner: string;
  balance?: string;
  modules?: any;
  createdAt?: number;
}

export interface TCAP_v4Ref {
  loadTokens: () => void;
}

interface BlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenName: string;
  tokenAddress: string;
}

function BlockDialog({ isOpen, onClose, onConfirm, tokenName, tokenAddress }: BlockDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="block-dialog-description">
        <DialogTitle>Hide Token</DialogTitle>
        <DialogDescription id="block-dialog-description">
          Are you sure you want to hide {tokenName}? You can show it again by toggling "Show Hidden Tokens".
        </DialogDescription>
        <div className="mt-4 flex justify-end gap-3" aria-describedby="block-dialog-description">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Hide Token</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TokenCardProps {
  token: TokenInfo;
  chainId?: number;
  isHidden: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onHideToken: () => void;
  onManageToken: () => void;
}

// Add interface for token management dialog
interface TokenManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenInfo;
  chainId?: number;
}

// Add a new TokenManageDialog component after BlockDialog
function TokenManageDialog({ isOpen, onClose, token, chainId }: TokenManageDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'tokenomics' | 'admin'>('overview');
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadTokenData = async () => {
      setLoading(true);
      
    try {
      if (!window.ethereum) {
          throw new Error('No Ethereum provider found. Please install a wallet like MetaMask.');
      }
        
      const provider = new BrowserProvider(window.ethereum);
        
        // Basic ERC20 interface with additional V4 token methods
      const tokenContract = new Contract(
        token.address,
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
            'function dynamicTaxEnabled() view returns (bool)',
            'function getModules() view returns (address[] memory)'
          ],
          provider
        );
        
        // Fetch token info with graceful fallbacks for missing methods
        const [
          decimals,
          paused,
          antiDumpEnabled,
          maxTxAmount,
          maxWalletAmount,
          buyTaxRate,
          sellTaxRate,
          dynamicTaxEnabled
        ] = await Promise.all([
          tokenContract.decimals().catch(() => 18),
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
          ...token,
          decimals,
          paused,
          antiDumpEnabled,
          maxTxAmount: maxTxAmount ? ethers.formatUnits(maxTxAmount, decimals) : "0",
          maxWalletAmount: maxWalletAmount ? ethers.formatUnits(maxWalletAmount, decimals) : "0",
          buyTaxRate: buyTaxRate ? Math.round(Number(buyTaxRate) / 100) : 0,
          sellTaxRate: sellTaxRate ? Math.round(Number(sellTaxRate) / 100) : 0,
          dynamicTaxEnabled
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
  }, [isOpen, token, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-gray-900 border-gray-700 text-white">
        <DialogTitle className="text-xl font-bold text-white">{token.name} <Badge variant="outline" className="text-white border-gray-600 ml-2">{token.symbol}</Badge></DialogTitle>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner className="h-6 w-6" />
            <span className="ml-2 text-white">Loading token data...</span>
          </div>
        ) : !tokenData ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-md">
            <p className="text-red-400">Could not load token data. Please try again.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-3 bg-gray-800/50 border border-gray-700/50">
                <h3 className="text-sm font-medium text-gray-300 mb-1">Total Supply</h3>
                <p className="text-lg font-bold text-white">{parseFloat(tokenData.totalSupply).toLocaleString()} {tokenData.symbol}</p>
              </Card>
              
              <Card className="p-3 bg-gray-800/50 border border-gray-700/50">
                <h3 className="text-sm font-medium text-gray-300 mb-1">Address</h3>
                <div className="flex items-center">
                  <p className="text-sm font-mono text-white truncate">{shortenAddress(tokenData.address)}</p>
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
                    <CopyIcon className="h-3.5 w-3.5 text-gray-300" />
                  </Button>
                </div>
              </Card>
              
              <Card className="p-3 bg-gray-800/50 border border-gray-700/50">
                <h3 className="text-sm font-medium text-gray-300 mb-1">Owner</h3>
                <p className="text-sm font-mono text-white truncate">{tokenData.owner ? shortenAddress(tokenData.owner) : 'Unknown'}</p>
              </Card>
            </div>
            
            <div className="flex space-x-1 border-b border-gray-700 mb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-2 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('tokenomics')}
                className={`px-3 py-2 text-sm font-medium border-b-2 ${
                  activeTab === 'tokenomics'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Tokenomics
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-2 text-sm font-medium border-b-2 ${
                  activeTab === 'admin'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Admin Controls
              </button>
            </div>
            
            {activeTab === 'overview' && (
              <Card className="p-4 bg-gray-800/50 border border-gray-700/50">
                <h2 className="text-lg font-bold text-white mb-3">Token Overview</h2>
                
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">Basic Information</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-gray-300">Name:</span>
                        <span className="text-white font-medium">{tokenData.name}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-gray-300">Symbol:</span>
                        <span className="text-white font-medium">{tokenData.symbol}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-gray-300">Decimals:</span>
                        <span className="text-white font-medium">{tokenData.decimals}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-gray-300">Total Supply:</span>
                        <span className="text-white font-medium">{parseFloat(tokenData.totalSupply).toLocaleString()} {tokenData.symbol}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button 
                        className="w-full"
                        onClick={() => {
                          if (chainId) {
                            window.open(getExplorerUrl(chainId, tokenData.address, 'token'), '_blank');
                          }
                        }}
                      >
                        View on Explorer
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">Status</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-gray-300">Network:</span>
                        <span className="text-white font-medium">
                          {chainId === 80002 ? 'Polygon Amoy' : `Chain ID: ${chainId}`}
                        </span>
                      </div>
                      {tokenData.paused !== undefined && (
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-gray-300">Status:</span>
                          <span className={`font-medium ${tokenData.paused ? 'text-red-400' : 'text-green-400'}`}>
                            {tokenData.paused ? 'Paused' : 'Active'}
                          </span>
                        </div>
                      )}
                      {tokenData.antiDumpEnabled !== undefined && (
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-gray-300">Anti-Dump:</span>
                          <span className={`font-medium ${tokenData.antiDumpEnabled ? 'text-green-400' : 'text-gray-300'}`}>
                            {tokenData.antiDumpEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      )}
                        </div>
                        </div>
                    </div>
              </Card>
            )}
            
            {activeTab === 'tokenomics' && (
              <Card className="p-4 bg-gray-800/50 border border-gray-700/50">
                <h2 className="text-lg font-bold text-white mb-3">Tokenomics</h2>
                
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {(tokenData.buyTaxRate !== undefined || tokenData.sellTaxRate !== undefined) && (
                    <div>
                      <h3 className="text-base font-semibold text-white mb-2">Tax Configuration</h3>
                      <div className="space-y-2">
                        {tokenData.buyTaxRate !== undefined && (
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-gray-300">Buy Tax:</span>
                            <span className="text-white font-medium">{tokenData.buyTaxRate}%</span>
                          </div>
                        )}
                        {tokenData.sellTaxRate !== undefined && (
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-gray-300">Sell Tax:</span>
                            <span className="text-white font-medium">{tokenData.sellTaxRate}%</span>
                          </div>
                        )}
                        {tokenData.dynamicTaxEnabled !== undefined && (
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-gray-300">Dynamic Tax:</span>
                            <span className={`font-medium ${tokenData.dynamicTaxEnabled ? 'text-green-400' : 'text-gray-300'}`}>
                              {tokenData.dynamicTaxEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(tokenData.maxTxAmount !== undefined || tokenData.maxWalletAmount !== undefined) && (
                    <div>
                      <h3 className="text-base font-semibold text-white mb-2">Transaction Limits</h3>
                      <div className="space-y-2">
                        {tokenData.maxTxAmount !== undefined && (
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-gray-300">Max Transaction:</span>
                            <span className="text-white font-medium">
                              {Number(tokenData.maxTxAmount) > 0 
                                ? `${Number(tokenData.maxTxAmount).toLocaleString()} ${tokenData.symbol}` 
                                : 'No Limit'}
                            </span>
                          </div>
                        )}
                        {tokenData.maxWalletAmount !== undefined && (
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <span className="text-gray-300">Max Wallet:</span>
                            <span className="text-white font-medium">
                              {Number(tokenData.maxWalletAmount) > 0 
                                ? `${Number(tokenData.maxWalletAmount).toLocaleString()} ${tokenData.symbol}` 
                                : 'No Limit'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
            
            {activeTab === 'admin' && (
              <Card className="p-4 bg-gray-800/50 border border-gray-700/50">
                <h2 className="text-lg font-bold text-white mb-3">Admin Controls</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">Token Controls</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tokenData.paused !== undefined && (
                        <Button variant="secondary">
                          {tokenData.paused ? 'Unpause Token' : 'Pause Token'}
                        </Button>
                      )}
                      <Button variant="secondary">Mint Tokens</Button>
                      <Button variant="secondary">Burn Tokens</Button>
                      <Button variant="secondary">Transfer Ownership</Button>
                    </div>
                  </div>
                  
                  {(tokenData.buyTaxRate !== undefined || tokenData.sellTaxRate !== undefined) && (
                    <div>
                      <h3 className="text-base font-semibold text-white mb-2">Tax Configuration</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button variant="secondary">Adjust Buy Tax</Button>
                        <Button variant="secondary">Adjust Sell Tax</Button>
                        {tokenData.dynamicTaxEnabled !== undefined && (
                          <Button variant="secondary">
                            {tokenData.dynamicTaxEnabled ? 'Disable Dynamic Tax' : 'Enable Dynamic Tax'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">Security Controls</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button variant="secondary">Manage Blacklist</Button>
                      <Button variant="secondary">Adjust Transaction Limits</Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Define TokenABI
const TokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function getModules() view returns (address[] memory)"
];

// Factory contract address will be determined dynamically based on the network
const TCAP_v4 = forwardRef<TCAP_v4Ref, TCAP_v4Props>(
  ({ isConnected, address, provider }, ref) => {
    const { toast } = useToast();
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [chainId, setChainId] = useState<number | null>(null);
    const [factoryError, setFactoryError] = useState<string | null>(null);
    const [blockDialogOpen, setBlockDialogOpen] = useState(false);
    const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
    const [showHiddenTokens, setShowHiddenTokens] = useState(false);
    const [hiddenTokens, setHiddenTokens] = useState<string[]>([]);
    const [expandedToken, setExpandedToken] = useState<string | null>(null);
    const [manageDialogOpen, setManageDialogOpen] = useState(false);
    const [tokenToManage, setTokenToManage] = useState<TokenInfo | null>(null);

    // Function to toggle token expansion
    const toggleExpand = useCallback((tokenAddress: string) => {
      setExpandedToken(prev => prev === tokenAddress ? null : tokenAddress);
    }, []);

    // Function to check if a token is expanded
    const isExpanded = useCallback((tokenAddress: string) => {
      return expandedToken === tokenAddress;
    }, [expandedToken]);

    // Get blocked tokens from local storage
    const getBlockedTokens = (): string[] => {
      const blocked = localStorage.getItem('blockedTokensV4');
      return blocked ? JSON.parse(blocked) : [];
    };

    // Save blocked tokens to local storage
    const saveBlockedTokens = (blocked: string[]) => {
      localStorage.setItem('blockedTokensV4', JSON.stringify(blocked));
    };

    // Handle block dialog open
    const handleBlockClick = (token: TokenInfo) => {
      setSelectedToken(token);
      setBlockDialogOpen(true);
    };

    // Handle block dialog confirm
    const handleBlockConfirm = () => {
      if (selectedToken) {
        handleHideToken(selectedToken.address);
      }
      setBlockDialogOpen(false);
      setSelectedToken(null);
    };

    // Expose the loadTokens function via ref
    useImperativeHandle(ref, () => ({
      loadTokens,
    }));

    // Initialize and get chain ID
    useEffect(() => {
      if (isConnected && provider) {
        const getChainId = async () => {
          try {
            // Handle different provider types
            if (provider.getNetwork) {
              // It's already an ethers provider
              const { chainId } = await provider.getNetwork();
              setChainId(Number(chainId));
            } else if (provider.request) {
              // It's a raw ethereum provider from the browser
              const chainIdHex = await provider.request({ method: 'eth_chainId' });
              setChainId(Number(parseInt(chainIdHex, 16)));
            }
          } catch (error) {
            console.error('Error getting chain ID:', error);
          }
        };
        getChainId();
      }
    }, [isConnected, provider]);

    // Factory ABI - minimal version just for getting tokens
    const FactoryABI = [
      "function createToken(string,string,uint256,address) returns (address)",
      "function createTokenForWeb(string,string,uint256,address,bool) returns (address)",
      "function createTokenWithSecurity(string,string,uint256,address,bool,address[],uint256) returns (address)",
      "function getTokenImplementation() view returns (address)",
      "function getSecurityModuleImplementation() view returns (address)",
      "function getAllTokens() view returns (address[])",
      "function getUserCreatedTokens(address) view returns (address[])",
      "function getUserTokens(address) view returns (address[])",
      "function getTokensByUser(address) view returns (address[])",
      "function getDeployedTokens(address) view returns (address[])",
      "function upgradeTokenImplementation(address) returns (bool)",
      "function upgradeSecurityModuleImplementation(address) returns (bool)",
      "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed owner)",
      "event TokenDeployed(address indexed tokenAddress, string name, string symbol, address indexed owner)"
    ];

    // Check if a contract exists at the address
    const contractExists = async (provider: any, address: string): Promise<boolean> => {
      try {
        const code = await provider.getCode(address);
        // If the address has code, it's a contract
        return code !== '0x' && code !== '0x0';
      } catch (error) {
        console.error('Error checking contract existence:', error);
        return false;
      }
    };

    const loadTokens = async () => {
      try {
        setLoading(true);
        console.log("Loading tokens...");
        
        if (!isConnected || !provider || !chainId || !address) {
          console.log("Not connected or missing address");
          setLoading(false);
          return;
        }
        
        // Initialize empty array to hold all tokens
        let allTokens: string[] = [];
        
        // For all networks including Polygon Amoy, attempt to load from all factory versions
        console.log(`Loading tokens for network ${chainId}`);
        
        // Try all factory versions in order of priority
        const factoryVersions = [
          'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V7',
          'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V6',
          'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V5', 
          'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V4',
          'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V3',
          'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED_V2',
          'FACTORY_ADDRESS_V4_WITH_LIQUIDITY_FIXED',
          'FACTORY_ADDRESS_V4'
        ];
        
        // Track if we found any factory
        let foundAnyFactory = false;
        
        // Try each factory version
        for (const version of factoryVersions) {
          try {
            const factoryAddress = getNetworkContractAddress(chainId, version);
            if (!factoryAddress) {
              console.log(`No factory address for ${version} on chain ${chainId}`);
              continue;
            }
            
            console.log(`Checking factory ${version} at ${factoryAddress}`);
            
            // Verify factory contract exists
            const exists = await contractExists(provider, factoryAddress);
            if (!exists) {
              console.log(`Factory contract not deployed at ${factoryAddress}`);
              continue;
            }
            
            console.log(`Factory ${version} exists at ${factoryAddress}, querying tokens...`);
            foundAnyFactory = true;
            
            // Create factory contract
            const factory = new Contract(factoryAddress, FactoryABI, provider);
            
            // Try different function names to get tokens
            const functionNamesToTry = [
              'getUserCreatedTokens',
              'getUserTokens',
              'getTokensByUser',
              'getDeployedTokens'
            ];
            
            for (const funcName of functionNamesToTry) {
              try {
                console.log(`Trying ${funcName} on ${version}...`);
                if (typeof factory[funcName] === 'function') {
                  const userTokens = await factory[funcName](address);
                  if (userTokens && userTokens.length > 0) {
                    console.log(`Found ${userTokens.length} tokens via ${funcName} on ${version}`);
                    
                    // Add tokens to our list, avoiding duplicates
                    for (const token of userTokens) {
                      if (!allTokens.includes(token)) {
                        allTokens.push(token);
                      }
                    }
                  }
                }
              } catch (e) {
                console.log(`${funcName} failed on ${version}:`, e);
              }
            }
          } catch (e) {
            console.error(`Error with factory ${version}:`, e);
          }
        }
        
        // Also check URL parameters
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const tokenFromUrl = urlParams.get('token');
          if (tokenFromUrl && !allTokens.includes(tokenFromUrl)) {
            console.log(`Found token in URL: ${tokenFromUrl}`);
            allTokens.push(tokenFromUrl);
          }
        } catch (e) {
          console.error("Error checking URL parameters:", e);
        }
        
        // Check if we found any tokens
        if (allTokens.length === 0) {
          if (foundAnyFactory) {
            setFactoryError("No tokens found for your account. Create a new token to get started.");
          } else {
            setFactoryError(`No factory contracts found for network ${chainId} or they're not deployed yet.`);
          }
          setLoading(false);
          return;
        }
        
        console.log(`Found ${allTokens.length} total tokens across all factories`);
        
        // Filter out blocked tokens
        const blockedTokens = getBlockedTokens();
        const filteredTokens = allTokens.filter(token => !blockedTokens.includes(token));
        
        // Process each token in parallel
        const tokenPromises = filteredTokens.map(async (tokenAddress) => {
          try {
            const tokenContract = new Contract(tokenAddress, TokenABI, provider);
            
            // Get basic token info with error handling for each call
            let name = "Unknown Token";
            let symbol = "???";
            let decimals = 18;
            let totalSupply = ethers.parseUnits("0", 18);
            let owner = "Unknown";
            let balance = ethers.parseUnits("0", 18);
            
            try { name = await tokenContract.name(); } catch (e) { console.log(`Failed to get name for ${tokenAddress}`); }
            try { symbol = await tokenContract.symbol(); } catch (e) { console.log(`Failed to get symbol for ${tokenAddress}`); }
            try { decimals = await tokenContract.decimals(); } catch (e) { console.log(`Failed to get decimals for ${tokenAddress}`); }
            try { totalSupply = await tokenContract.totalSupply(); } catch (e) { console.log(`Failed to get totalSupply for ${tokenAddress}`); }
            try { owner = await tokenContract.owner(); } catch (e) { console.log(`Failed to get owner for ${tokenAddress}`); }
            
            // Get user balance if address is available
            try { balance = await tokenContract.balanceOf(address); } catch (e) { console.log(`Failed to get balance for ${tokenAddress}`); }
            
            // Get modules data if available, with better error handling
            let modules = {};
            try {
              const moduleAddresses = await tokenContract.getModules();
              if (moduleAddresses && moduleAddresses.length > 0) {
                modules = {
                  liquidity: moduleAddresses[0],
                  distribution: moduleAddresses.length > 1 ? moduleAddresses[1] : undefined,
                  security: moduleAddresses.length > 2 ? moduleAddresses[2] : undefined
                };
              }
            } catch (e) {
              console.log(`Failed to get modules for ${tokenAddress}`);
            }
            
            return {
              address: tokenAddress,
              name,
              symbol,
              decimals,
              totalSupply: ethers.formatUnits(totalSupply, decimals),
              owner,
              balance: ethers.formatUnits(balance, decimals),
              modules,
              createdAt: Date.now() // Adding creation time for sorting
            };
          } catch (error) {
            console.error(`Error loading token ${tokenAddress}:`, error);
            return null;
          }
        });
        
        // Process results and filter out failures
        const results = await Promise.all(tokenPromises);
        const validTokens: TokenInfo[] = [];
        
        // Process and filter null values
        for (const token of results) {
          if (token !== null) {
            validTokens.push(token as TokenInfo);
          }
        }
        
        console.log(`Successfully loaded ${validTokens.length} valid tokens`);
        setTokens(validTokens);
        setFactoryError(null);
        
      } catch (error) {
        console.error("Error in loadTokens:", error);
        setFactoryError(`Error loading tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    // Load tokens on component mount if connected
    useEffect(() => {
      if (isConnected && provider) {
        loadTokens();
      }
    }, [isConnected, provider]);

    // Rerender when showHiddenTokens changes to apply filters
    useEffect(() => {
      if (tokens.length > 0) {
        loadTokens();
      }
    }, [showHiddenTokens]);

    const handleHideToken = useCallback((tokenAddress: string) => {
      if (hiddenTokens.includes(tokenAddress)) {
        // Unhide token
        const updatedHiddenTokens = hiddenTokens.filter(addr => addr !== tokenAddress);
        setHiddenTokens(updatedHiddenTokens);
        localStorage.setItem('v4HiddenTokens', JSON.stringify(updatedHiddenTokens));
        toast({
          title: "Token Unhidden",
          description: "The token will now be visible in the default view",
        });
      } else {
        // Hide token
        const updatedHiddenTokens = [...hiddenTokens, tokenAddress];
        setHiddenTokens(updatedHiddenTokens);
        localStorage.setItem('v4HiddenTokens', JSON.stringify(updatedHiddenTokens));
        toast({
          title: "Token Hidden",
          description: "The token will be hidden from the default view",
        });
      }
    }, [hiddenTokens, toast]);

    // Get the list of tokens to display
    const displayedTokens = useMemo(() => {
      if (showHiddenTokens) {
        return tokens;
      } else {
        return tokens.filter(token => !hiddenTokens.includes(token.address));
      }
    }, [tokens, hiddenTokens, showHiddenTokens]);

    // New function to open token management dialog
    const handleManageToken = (token: TokenInfo) => {
      setTokenToManage(token);
      setManageDialogOpen(true);
    };

    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">V4 Token Manager</h2>
            <p className="text-sm text-gray-300">Manage your V4 tokens</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="text-xs"
              onClick={() => setShowHiddenTokens(!showHiddenTokens)}
            >
              {showHiddenTokens ? 'Hide Blocked Tokens' : 'Show All Tokens'}
            </Button>
            <Button 
              onClick={() => loadTokens()}
              variant="secondary"
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {factoryError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
            <p className="font-semibold">Factory Contract Error</p>
            <p className="text-xs mt-1">{factoryError}</p>
          </div>
        )}

        {isConnected ? (
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Spinner className="h-6 w-6" />
                <span className="ml-2 text-white">Loading tokens...</span>
              </div>
            ) : displayedTokens.length === 0 ? (
              <div className="p-6 border border-gray-700 rounded-md bg-gray-800/50 text-center">
                <p className="text-white">No tokens found.</p>
                <p className="text-sm text-gray-300 mt-1">Deploy a new token to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-gray-300 mb-2">
                  {displayedTokens.length} token{displayedTokens.length !== 1 ? 's' : ''} found
                </div>
                <div className="space-y-2">
                  {displayedTokens.map((token) => (
                    <TokenCard
                      key={token.address}
                      token={token}
                      chainId={chainId ?? undefined}
                      isHidden={hiddenTokens.includes(token.address)}
                      isExpanded={isExpanded(token.address)}
                      onToggleExpand={() => toggleExpand(token.address)}
                      onHideToken={() => handleHideToken(token.address)}
                      onManageToken={() => handleManageToken(token)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 border border-yellow-500/30 bg-yellow-500/10 rounded-md">
            <p className="text-yellow-400">Please connect your wallet to manage tokens.</p>
          </div>
        )}

        {/* Dialogs for token actions */}
        {selectedToken && (
          <BlockDialog 
            isOpen={blockDialogOpen}
            onClose={() => setBlockDialogOpen(false)}
            onConfirm={handleBlockConfirm}
            tokenName={selectedToken.name}
            tokenAddress={selectedToken.address}
          />
        )}
        
        {tokenToManage && (
          <TokenManageDialog
            isOpen={manageDialogOpen}
            onClose={() => setManageDialogOpen(false)}
            token={tokenToManage}
            chainId={chainId ?? undefined}
          />
        )}
      </div>
    );
  }
);

TCAP_v4.displayName = "TCAP_v4";

const TokenCard = ({ 
  token, 
  chainId, 
  isHidden, 
  isExpanded, 
  onToggleExpand, 
  onHideToken, 
  onManageToken 
}: TokenCardProps) => {
  const { toast } = useToast();
  
  // Add the addTokenToWallet function inside TokenCard where it has access to the token prop
  const addTokenToWallet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!window.ethereum) {
        throw new Error("No Ethereum wallet found");
      }

      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: token.address,
            symbol: token.symbol,
            decimals: 18, // Most ERC20 tokens use 18 decimals
            image: '', // Optional token logo URL
          },
        },
      });

      if (wasAdded) {
        toast({
          title: "Success",
          description: `${token.symbol} has been added to your wallet`,
        });
      } else {
        // User rejected the request
        toast({
          title: "Cancelled",
          description: "You cancelled the request to add the token",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding token to wallet:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add token to wallet",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className={`bg-gray-800/50 border ${isHidden ? 'border-red-500/30' : 'border-gray-700/50'}`}>
      {/* Header - always visible */}
      <div 
        className="p-3 flex justify-between items-center cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 flex-grow">
          <div className={`w-5 h-5 flex items-center justify-center transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}>
            <ChevronDown size={18} className="text-white" />
          </div>
          
          <div className="flex-grow">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white">{token.name}</h3>
              <Badge variant="outline" className="text-xs text-white border-gray-600">
                {token.symbol}
              </Badge>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/50 text-xs">
                V4
              </Badge>
            </div>
            
            <div className="text-sm text-gray-300 mt-0.5">
              <span>Supply: {parseFloat(token.totalSupply).toLocaleString()} {token.symbol}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                if (chainId) {
                  window.open(getExplorerUrl(chainId, token.address), '_blank');
                }
              }}
            >
              <ExternalLink size={16} className="text-gray-300" />
            </Button>
            
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onManageToken();
              }}
            >
              <Settings size={16} className="text-gray-300" />
            </Button>
            
            <Button
              variant={isHidden ? "destructive" : "ghost"}
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onHideToken();
              }}
            >
              {isHidden ? <EyeOff size={16} /> : <Eye size={16} className="text-gray-300" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-0 border-t border-gray-700">
          <div className="space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs text-gray-300 mb-1">Token Address</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-white">{shortenAddress(token.address)}</span>
                  <Button
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(token.address);
                      toast({
                        title: "Address Copied",
                        description: "Token address copied to clipboard",
                      });
                    }}
                  >
                    <CopyIcon className="h-3.5 w-3.5 text-gray-300" />
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="text-xs text-gray-300 mb-1">Owner</h4>
                <div className="text-sm font-mono text-white">
                  {token.owner ? shortenAddress(token.owner) : 'Unknown'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <h4 className="text-xs text-gray-300 mb-1">Name</h4>
                <div className="text-sm text-white">{token.name}</div>
              </div>
              
              <div>
                <h4 className="text-xs text-gray-300 mb-1">Symbol</h4>
                <div className="text-sm text-white">{token.symbol}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 mt-3">
              <div>
                <h4 className="text-xs text-gray-300 mb-1">Total Supply</h4>
                <div className="text-sm text-white">{parseFloat(token.totalSupply).toLocaleString()} {token.symbol}</div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-700 flex justify-end gap-2">
              <Button
                variant="secondary"
                className="text-xs py-1 px-2 border-gray-600 text-white"
                onClick={addTokenToWallet}
              >
                Add to Wallet
              </Button>
              <Button
                variant="secondary"
                className="text-xs py-1 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  if (chainId) {
                    window.open(getExplorerUrl(chainId, token.address), '_blank');
                  }
                }}
              >
                View on Explorer
              </Button>
              <Button
                variant="default"
                className="text-xs py-1 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageToken();
                }}
              >
                Manage Token
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// Copy icon component
const CopyIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
};

export default TCAP_v4; 