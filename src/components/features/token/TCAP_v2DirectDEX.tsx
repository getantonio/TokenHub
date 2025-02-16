import { useState, useEffect, useRef, forwardRef, ReactNode, useMemo } from 'react';
import { Contract, BrowserProvider, formatEther, Log, EventLog, Result, parseEther, Interface } from 'ethers';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/components/ui/toast/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { getNetworkContractAddress } from '@/config/contracts';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import TokenFactoryV2DirectDEXABI from '@/contracts/abi/TokenFactory_v2_DirectDEX.json';
import { contractAddresses } from '@/config/contracts';

interface Props {
  isConnected: boolean;
  address?: string;  // Factory address
  provider: any;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  owner: string;
  dexInfo: {
    dexName: string;
    router: string;
    pair: string;
    initialLiquidity: string;
    listingPrice: string;
  };
  tradingInfo: {
    enabled: boolean;
    startTime: number;
    maxTxAmount: string;
    maxWalletAmount: string;
  };
  feeInfo: {
    marketingFee: string;
    developmentFee: string;
    autoLiquidityFee: string;
    marketingWallet: string;
    developmentWallet: string;
  };
  createdAt?: number;
}

interface TokenListedEvent extends EventLog {
  args: Result & {
    token: string;
    owner: string;
    initialLiquidity: bigint;
    listingPrice: bigint;
  };
}

interface TCAP_v2DirectDEXRef {
  loadTokens: () => void;
}

interface ListingParams {
  token: string;
  initialLiquidityInETH: string;
  listingPriceInETH: string;
  dexName: string;
  liquidityPercentage: string;
}

const TCAP_v2DirectDEX = forwardRef<TCAP_v2DirectDEXRef, Props>(({ isConnected, address: factoryAddress, provider: externalProvider }, ref): ReactNode => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecent, setShowRecent] = useState(true);
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [listingParams, setListingParams] = useState<ListingParams>({
    token: '',
    initialLiquidityInETH: '',
    listingPriceInETH: '',
    dexName: '',
    liquidityPercentage: '0'
  });
  const [listingFee, setListingFee] = useState<string>('0');
  const [hiddenTokens, setHiddenTokens] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hiddenTokensV2DirectDEX');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const visibleTokens = useMemo(() => {
    const filteredTokens = tokens.filter(token => !hiddenTokens.includes(token.address));
    const sortedTokens = [...filteredTokens].sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeB - timeA;
    });
    
    return showRecent ? sortedTokens.slice(0, 3) : sortedTokens;
  }, [tokens, showRecent, hiddenTokens]);

  const getTokenContract = (tokenAddress: string, signer: any) => {
    return new Contract(tokenAddress, [
      // Basic token functions
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function totalSupply() view returns (uint256)',
      'function owner() view returns (address)',
      // Trading settings
      'function tradingEnabled() view returns (bool)',
      'function tradingStartTime() view returns (uint256)',
      'function maxTxAmount() view returns (uint256)',
      'function maxWalletAmount() view returns (uint256)',
      // DEX settings
      'function dexRouter() view returns (address)',
      'function dexPair() view returns (address)',
      // Fee settings
      'function marketingFeePercentage() view returns (uint256)',
      'function developmentFeePercentage() view returns (uint256)',
      'function autoLiquidityFeePercentage() view returns (uint256)',
      'function marketingWallet() view returns (address)',
      'function developmentWallet() view returns (address)'
    ], signer);
  };

  const loadTokens = async () => {
    if (!externalProvider || !factoryAddress) {
      console.log('Provider or factory address not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading tokens from factory:', factoryAddress);
      const provider = new BrowserProvider(externalProvider);
      const signer = await provider.getSigner();

      const factory = new Contract(factoryAddress, [
        'function isListed(address token) view returns (bool)',
        'function tokenDEX(address token) view returns (string)',
        'function getDEXRouter(string) view returns (tuple(string name, address router, bool isActive))',
        'function listTokenOnDEX(address token, uint256 initialLiquidityInETH, uint256 listingPriceInETH, string memory dexName, uint256 liquidityPercentage) payable returns (bool)',
        'function getListingFee() view returns (uint256)'
      ], signer);

      // Get all token listing events
      const filter = factory.filters.TokenListed();
      const events = await factory.queryFilter(filter);
      
      const userAddress = await signer.getAddress();
      
      // Filter events for tokens owned by the current user
      const userEvents = events.filter(event => (event as TokenListedEvent).args?.owner === userAddress);

      const tokenPromises = userEvents.map(async (event) => {
        const tokenAddress = (event as TokenListedEvent).args?.token;
        if (!tokenAddress) return null;

        try {
          const token = new Contract(tokenAddress, [
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function totalSupply() view returns (uint256)',
            'function owner() view returns (address)',
            'function dexRouter() view returns (address)',
            'function dexPair() view returns (address)',
            'function tradingEnabled() view returns (bool)',
            'function tradingStartTime() view returns (uint256)',
            'function maxTxAmount() view returns (uint256)',
            'function maxWalletAmount() view returns (uint256)',
            'function marketingFeePercentage() view returns (uint256)',
            'function developmentFeePercentage() view returns (uint256)',
            'function autoLiquidityFeePercentage() view returns (uint256)',
            'function marketingWallet() view returns (address)',
            'function developmentWallet() view returns (address)'
          ], signer);

          const [
            name,
            symbol,
            totalSupply,
            owner,
            dexRouter,
            dexPair,
            tradingEnabled,
            tradingStartTime,
            maxTxAmount,
            maxWalletAmount,
            marketingFee,
            developmentFee,
            autoLiquidityFee,
            marketingWallet,
            developmentWallet
          ] = await Promise.all([
            token.name(),
            token.symbol(),
            token.totalSupply(),
            token.owner(),
            token.dexRouter(),
            token.dexPair(),
            token.tradingEnabled(),
            token.tradingStartTime(),
            token.maxTxAmount(),
            token.maxWalletAmount(),
            token.marketingFeePercentage(),
            token.developmentFeePercentage(),
            token.autoLiquidityFeePercentage(),
            token.marketingWallet(),
            token.developmentWallet()
          ]);

          const dexName = await factory.tokenDEX(tokenAddress);
          const dexInfo = await factory.getDEXRouter(dexName);

          return {
            address: tokenAddress,
            name,
            symbol,
            totalSupply: formatEther(totalSupply),
            owner,
            dexInfo: {
              dexName,
              router: dexRouter,
              pair: dexPair,
              initialLiquidity: (event as TokenListedEvent).args.initialLiquidity ? formatEther((event as TokenListedEvent).args.initialLiquidity) : '0',
              listingPrice: (event as TokenListedEvent).args.listingPrice ? formatEther((event as TokenListedEvent).args.listingPrice) : '0'
            },
            tradingInfo: {
              enabled: tradingEnabled,
              startTime: Number(tradingStartTime),
              maxTxAmount: formatEther(maxTxAmount),
              maxWalletAmount: formatEther(maxWalletAmount)
            },
            feeInfo: {
              marketingFee: marketingFee.toString(),
              developmentFee: developmentFee.toString(),
              autoLiquidityFee: autoLiquidityFee.toString(),
              marketingWallet,
              developmentWallet
            },
            createdAt: event.blockNumber ? new Date().getTime() : Date.now()
          } as TokenInfo;
        } catch (error) {
          console.error(`Error loading token ${tokenAddress}:`, error);
          return null;
        }
      });

      const loadedTokens = (await Promise.all(tokenPromises))
        .filter((token): token is TokenInfo => token !== null)
        .sort((a, b) => {
          const timeA = a.createdAt || 0;
          const timeB = b.createdAt || 0;
          return timeB - timeA;
        });

      setTokens(loadedTokens);
    } catch (error) {
      console.error('Error loading tokens:', error);
      setError('Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleListToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !factoryAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    const factoryContractAddress = getNetworkContractAddress(Number(chainId), 'factoryAddressV2DirectDEX');
    if (!factoryContractAddress) {
      toast({
        title: "Error",
        description: "Factory not deployed on this network",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create factory contract instance
      const factory = new Contract(
        factoryContractAddress,
        TokenFactoryV2DirectDEXABI,
        signer
      );

      // Get listing fee
      const listingFee = await factory.getListingFee();
      console.log("Listing Fee:", formatEther(listingFee));

      // Create token contract instance to check total supply and calculate tokens needed for liquidity
      const tokenContract = new Contract(
        listingParams.token,
        ['function totalSupply() view returns (uint256)', 'function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );

      // Calculate total value needed (listing fee + initial liquidity)
      const totalValue = listingFee.add(parseEther(listingParams.initialLiquidityInETH));

      // List token
      const tx = await factory.listTokenOnDEX(
        listingParams.token,
        parseEther(listingParams.initialLiquidityInETH),
        parseEther(listingParams.listingPriceInETH),
        listingParams.dexName,
        BigInt(listingParams.liquidityPercentage),
        {
          value: totalValue,
          gasLimit: 5000000
        }
      );

      console.log("Transaction hash:", tx.hash);
      const receipt = await tx.wait();

      toast({
        title: "Success",
        description: `Token listed successfully on ${listingParams.dexName}`,
        variant: "default"
      });

      // Refresh token list
      loadTokens();
    } catch (error) {
      console.error("Error listing token:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to list token. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && factoryAddress && externalProvider) {
      loadTokens();
    }
  }, [isConnected, factoryAddress, externalProvider]);

  useEffect(() => {
    localStorage.setItem('hiddenTokensV2DirectDEX', JSON.stringify(hiddenTokens));
  }, [hiddenTokens]);

  // Expose loadTokens method
  useEffect(() => {
    if (ref) {
      (ref as any).current = {
        loadTokens
      };
    }
  }, [ref, loadTokens]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getExplorerUrl = (chainId: number | undefined | null) => {
    if (!chainId) return '';
    switch (chainId) {
      case 11155111: // Sepolia
        return 'https://sepolia.etherscan.io';
      case 421614: // Arbitrum Sepolia
        return 'https://sepolia.arbiscan.io';
      case 11155420: // Optimism Sepolia
        return 'https://sepolia-optimism.etherscan.io';
      case 80002: // Polygon Amoy
        return 'https://www.oklink.com/amoy';
      case 97: // BSC Testnet
        return 'https://testnet.bscscan.com';
      case 56: // BSC Mainnet
        return 'https://bscscan.com';
      default:
        return '';
    }
  };

  const handleSwitchChange = (checked: boolean, field: keyof ListingParams) => {
    setListingParams(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  return (
    <div ref={containerRef} className="w-full space-y-4">
      <div className="flex justify-between items-center bg-background-secondary p-4 rounded-lg">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Your Listed Tokens</h2>
          <span className="text-sm text-text-secondary">
            {showRecent ? `Showing last ${Math.min(visibleTokens.length, 3)} of ${tokens.length} tokens` : `Showing all ${tokens.length} tokens`}
          </span>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowRecent(!showRecent)}
          className="text-sm hover:bg-background-accent"
        >
          {showRecent ? "Show All" : "Show Recent"}
        </Button>
      </div>
      {!isConnected && (
        <p className="text-muted-foreground">Please connect your wallet to view your tokens.</p>
      )}
      {isConnected && isLoading && (
        <p className="text-muted-foreground">Loading your tokens...</p>
      )}
      {isConnected && !isLoading && tokens.length === 0 && (
        <p className="text-muted-foreground">You haven't listed any tokens yet.</p>
      )}
      {isLoading ? (
        <Card className="p-4">
          <div className="flex items-center justify-center">
            <Spinner className="w-6 h-6 mr-2" />
            <p className="text-text-secondary">Loading tokens...</p>
          </div>
        </Card>
      ) : error ? (
        <Card className="p-4">
          <p className="text-center text-red-500">{error}</p>
        </Card>
      ) : visibleTokens.length === 0 ? (
        <Card className="p-4">
          <p className="text-center text-text-secondary">No tokens found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleTokens.map((token, index) => (
            <Card key={token.address} className="p-4 bg-background-secondary border-border relative">
              <Button
                variant="ghost"
                onClick={() => {
                  setHiddenTokens(prev => [...prev, token.address]);
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-white"
              >
                Hide
              </Button>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{token.name} ({token.symbol})</h3>
                <p className="text-sm text-muted-foreground">Address: {token.address}</p>
                <p className="text-sm">Total Supply: {token.totalSupply}</p>
                <div className="space-y-2">
                  <h4 className="font-medium">DEX Info</h4>
                  {token.dexInfo.dexName ? (
                    <>
                      <p className="text-sm">DEX: {token.dexInfo.dexName}</p>
                      <p className="text-sm">Initial Liquidity: {token.dexInfo.initialLiquidity} ETH</p>
                      <p className="text-sm">Listing Price: {token.dexInfo.listingPrice} ETH</p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="Initial Liquidity (ETH)"
                        value={listingParams.initialLiquidityInETH}
                        onChange={(e) => setListingParams(prev => ({ 
                          ...prev, 
                          token: token.address, 
                          initialLiquidityInETH: e.target.value 
                        }))}
                      />
                      <Input
                        type="text"
                        placeholder="Listing Price (ETH)"
                        value={listingParams.listingPriceInETH}
                        onChange={(e) => setListingParams(prev => ({ 
                          ...prev, 
                          listingPriceInETH: e.target.value 
                        }))}
                      />
                      <Select
                        value={listingParams.dexName}
                        onValueChange={(value) => setListingParams(prev => ({ 
                          ...prev, 
                          dexName: value 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a DEX" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uniswap-test">Uniswap</SelectItem>
                          <SelectItem value="pancakeswap-test">PancakeSwap</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        placeholder="Liquidity Percentage"
                        value={listingParams.liquidityPercentage}
                        onChange={(e) => setListingParams(prev => ({ 
                          ...prev, 
                          liquidityPercentage: e.target.value 
                        }))}
                      />
                      <Button 
                        onClick={handleListToken}
                        disabled={
                          !listingParams.initialLiquidityInETH || 
                          !listingParams.listingPriceInETH || 
                          !listingParams.dexName ||
                          !listingParams.liquidityPercentage ||
                          listingParams.token !== token.address
                        }
                        className="w-full"
                      >
                        List on DEX
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium">Trading Info</h4>
                  <p className="text-sm">Max Transaction: {token.tradingInfo.maxTxAmount}</p>
                  <p className="text-sm">Max Wallet: {token.tradingInfo.maxWalletAmount}</p>
                  <p className="text-sm">Trading Enabled: {token.tradingInfo.enabled ? 'Yes' : 'No'}</p>
                  <p className="text-sm">Trading Start: {formatDate(token.tradingInfo.startTime)}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium">Fee Info</h4>
                  <p className="text-sm">Marketing Fee: {token.feeInfo.marketingFee}%</p>
                  <p className="text-sm">Development Fee: {token.feeInfo.developmentFee}%</p>
                  <p className="text-sm">Auto-Liquidity Fee: {token.feeInfo.autoLiquidityFee}%</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

TCAP_v2DirectDEX.displayName = 'TCAP_v2DirectDEX';

export default TCAP_v2DirectDEX; 