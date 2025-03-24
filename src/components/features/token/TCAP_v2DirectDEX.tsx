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
import { ethers } from 'ethers';

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
  const [showRecentCreated, setShowRecentCreated] = useState(true);
  const [createdTokens, setCreatedTokens] = useState<TokenInfo[]>([]);
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

  const visibleCreatedTokens = useMemo(() => {
    const sortedTokens = [...createdTokens].sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeB - timeA;
    });
    
    return showRecentCreated ? sortedTokens.slice(0, 3) : sortedTokens;
  }, [createdTokens, showRecentCreated]);

  const visibleTokens = useMemo(() => {
    const sortedTokens = [...tokens].sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeB - timeA;
    });
    
    return showRecent ? sortedTokens.slice(0, 3) : sortedTokens;
  }, [tokens, showRecent]);

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

      // Get factory addresses for both Make and Bake contracts
      const makeFactoryAddress = getNetworkContractAddress(Number(chainId), 'factoryAddressV2DirectDEX_Make');
      const bakeFactoryAddress = getNetworkContractAddress(Number(chainId), 'factoryAddressV2DirectDEX_Bake');

      if (!makeFactoryAddress || !bakeFactoryAddress) {
        throw new Error('Factory addresses not available');
      }

      // Create contract instances
      const makeFactory = new Contract(makeFactoryAddress, [
        'function getUserCreatedTokens(address) view returns (address[])',
        'function getTokenInfo(address) view returns (tuple(address token, address owner, bool isListed, string dexName, uint256 creationTime, uint256 listingTime))'
      ], signer);

      const bakeFactory = new Contract(bakeFactoryAddress, [
        'function isListed(address token) view returns (bool)',
        'function tokenDEX(address token) view returns (string)',
        'function getDEXRouter(string) view returns (tuple(string name, address router, bool isActive))',
        'function getListingFee() view returns (uint256)'
      ], signer);

      const userAddress = await signer.getAddress();

      // Load created tokens
      const createdTokenAddresses = await makeFactory.getUserCreatedTokens(userAddress);
      const createdTokenPromises = createdTokenAddresses.map(async (tokenAddress: string) => {
        try {
          const tokenContract = getTokenContract(tokenAddress, signer);
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
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.totalSupply(),
            tokenContract.owner(),
            tokenContract.dexRouter(),
            tokenContract.dexPair(),
            tokenContract.tradingEnabled(),
            tokenContract.tradingStartTime(),
            tokenContract.maxTxAmount(),
            tokenContract.maxWalletAmount(),
            tokenContract.marketingFeePercentage(),
            tokenContract.developmentFeePercentage(),
            tokenContract.autoLiquidityFeePercentage(),
            tokenContract.marketingWallet(),
            tokenContract.developmentWallet()
          ]);

          const tokenInfo = await makeFactory.getTokenInfo(tokenAddress);

          return {
            address: tokenAddress,
            name,
            symbol,
            totalSupply: formatEther(totalSupply),
            owner,
            dexInfo: {
              dexName: tokenInfo.dexName || '',
              router: dexRouter,
              pair: dexPair,
              initialLiquidity: '0',
              listingPrice: '0'
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
            createdAt: Number(tokenInfo.creationTime) * 1000
          } as TokenInfo;
        } catch (error) {
          console.error(`Error loading created token ${tokenAddress}:`, error);
          return null;
        }
      });

      // Get all token listing events for listed tokens
      const filter = bakeFactory.filters.TokenListed();
      const events = await bakeFactory.queryFilter(filter);
      const userEvents = events.filter(event => (event as TokenListedEvent).args?.owner === userAddress);

      const listedTokenPromises = userEvents.map(async (event) => {
        const tokenAddress = (event as TokenListedEvent).args?.token;
        if (!tokenAddress) return null;

        try {
          const tokenContract = getTokenContract(tokenAddress, signer);
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
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.totalSupply(),
            tokenContract.owner(),
            tokenContract.dexRouter(),
            tokenContract.dexPair(),
            tokenContract.tradingEnabled(),
            tokenContract.tradingStartTime(),
            tokenContract.maxTxAmount(),
            tokenContract.maxWalletAmount(),
            tokenContract.marketingFeePercentage(),
            tokenContract.developmentFeePercentage(),
            tokenContract.autoLiquidityFeePercentage(),
            tokenContract.marketingWallet(),
            tokenContract.developmentWallet()
          ]);

          const dexName = await bakeFactory.tokenDEX(tokenAddress);
          const dexInfo = await bakeFactory.getDEXRouter(dexName);

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
          console.error(`Error loading listed token ${tokenAddress}:`, error);
          return null;
        }
      });

      const [loadedCreatedTokens, loadedListedTokens] = await Promise.all([
        Promise.all(createdTokenPromises),
        Promise.all(listedTokenPromises)
      ]);

      setCreatedTokens(loadedCreatedTokens.filter((token): token is TokenInfo => token !== null));
      setTokens(loadedListedTokens.filter((token): token is TokenInfo => token !== null));
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

  const getLPTokenDetails = async (tokenAddress: string, signer: any): Promise<{
    pairAddress: string;
    lpBalance: string;
    totalSupply: string;
    reserves: {
      token: string;
      eth: string;
    }
  }> => {
    const zeroAddr = "0x0000000000000000000000000000000000000000";

    const UNISWAP_V2_FACTORY = process.env.NEXT_PUBLIC_UNISWAPV2FACTORY || '0x0000000000000000000000000000000000000000';
    const WETH_SEPOLIA = process.env.NEXT_PUBLIC_WETH || '0x0000000000000000000000000000000000000000';

    if (!process.env.NEXT_PUBLIC_UNISWAPV2FACTORY || !process.env.NEXT_PUBLIC_WETH) {
      console.error('Missing required environment variables for DEX configuration');
    }

    try {
      console.log('Getting LP details for token:', tokenAddress);
      console.log('Using Factory:', UNISWAP_V2_FACTORY);
      console.log('Using WETH:', WETH_SEPOLIA);
      
      const userAddress = await signer.getAddress();
      console.log('User address:', userAddress);

      // Create factory contract with more detailed error logging
      const factoryContract = new Contract(
        UNISWAP_V2_FACTORY,
        [
          'function getPair(address tokenA, address tokenB) external view returns (address pair)',
        ],
        signer
      );

      // Get pair address with both token orderings
      console.log('Checking pair (token, WETH)...');
      let pairAddress = await factoryContract.getPair(tokenAddress, WETH_SEPOLIA);
      console.log('First pair check result:', pairAddress);
      
      if (pairAddress === zeroAddr) {
        console.log('Checking pair (WETH, token)...');
        pairAddress = await factoryContract.getPair(WETH_SEPOLIA, tokenAddress);
        console.log('Second pair check result:', pairAddress);
      }

      if (pairAddress === zeroAddr) {
        console.log('No liquidity pair found for either ordering');
        throw new Error('No liquidity pair found');
      }

      console.log('Found pair address:', pairAddress);

      // Create pair contract with more detailed ABI
      const pairContract = new Contract(
        pairAddress,
        [
          'function token0() external view returns (address)',
          'function token1() external view returns (address)',
          'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
          'function totalSupply() external view returns (uint)',
          'function balanceOf(address) external view returns (uint)',
          'function decimals() external pure returns (uint8)',
          'function symbol() external view returns (string)'
        ],
        signer
      );

      console.log('Getting pair details...');
      
      // Get all pair information in parallel with error handling
      const [token0, token1, reserves, totalSupply, lpBalance, symbol] = await Promise.all([
        pairContract.token0().catch(e => { console.error('Error getting token0:', e); throw e; }),
        pairContract.token1().catch(e => { console.error('Error getting token1:', e); throw e; }),
        pairContract.getReserves().catch(e => { console.error('Error getting reserves:', e); throw e; }),
        pairContract.totalSupply().catch(e => { console.error('Error getting totalSupply:', e); throw e; }),
        pairContract.balanceOf(userAddress).catch(e => { console.error('Error getting lpBalance:', e); throw e; }),
        pairContract.symbol().catch(e => { console.error('Error getting symbol:', e); return 'UNI-V2'; })
      ]);

      console.log('Pair details:', {
        token0,
        token1,
        reserves: reserves.map((r: bigint) => r.toString()),
        totalSupply: totalSupply.toString(),
        lpBalance: lpBalance.toString(),
        symbol
      });

      // Determine which token is which
      const isToken0 = tokenAddress.toLowerCase() === token0.toLowerCase();
      const tokenReserve = isToken0 ? reserves[0] : reserves[1];
      const ethReserve = isToken0 ? reserves[1] : reserves[0];

      console.log('Formatted values:', {
        tokenReserve: formatEther(tokenReserve),
        ethReserve: formatEther(ethReserve)
      });

      return {
        pairAddress,
        lpBalance: formatEther(lpBalance),
        totalSupply: formatEther(totalSupply),
        reserves: {
          token: formatEther(tokenReserve),
          eth: formatEther(ethReserve)
        }
      };
    } catch (error) {
      console.error('Error getting LP details:', error);
      return {
        pairAddress: zeroAddr,
        lpBalance: '0',
        totalSupply: '0',
        reserves: {
          token: '0',
          eth: '0'
        }
      };
    }
  };

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {/* Token Statistics Header */}
      <div className="bg-background-secondary p-4 rounded-lg">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Token Statistics</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">
                {createdTokens.length} Total Created Tokens ({visibleCreatedTokens.length} Visible)
              </span>
              <Button
                variant="secondary"
                onClick={() => setShowRecentCreated(!showRecentCreated)}
                className="text-sm"
              >
                {showRecentCreated ? "Show All" : "Hide All"}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Sort By: Date</span>
            <span>↓ Descending</span>
          </div>
        </div>
      </div>

      {!isConnected && (
        <p className="text-muted-foreground">Please connect your wallet to view your tokens.</p>
      )}

      {isConnected && isLoading && (
        <Card className="p-4">
          <div className="flex items-center justify-center">
            <Spinner className="w-6 h-6 mr-2" />
            <p className="text-text-secondary">Loading tokens...</p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4">
          <p className="text-center text-red-500">{error}</p>
        </Card>
      )}

      {/* Created Tokens Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-background-secondary p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Your Created Tokens</h2>
            <span className="text-sm text-text-secondary">
              {showRecentCreated ? `Showing last ${Math.min(visibleCreatedTokens.length, 3)} of ${createdTokens.length} tokens` : `Showing all ${createdTokens.length} tokens`}
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowRecentCreated(!showRecentCreated)}
            className="text-sm hover:bg-background-accent"
          >
            {showRecentCreated ? "Show All" : "Show Recent"}
          </Button>
        </div>

        {/* Created Tokens Cards */}
        {visibleCreatedTokens.length === 0 ? (
          <Card className="p-4">
            <p className="text-center text-text-secondary">No created tokens found</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleCreatedTokens.map((token) => (
              <Card key={token.address} className="p-4 bg-background-secondary border-border relative">
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
                            <SelectItem value="quickswap-test">QuickSwap</SelectItem>
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

      {/* Listed Tokens Section */}
      <div className="space-y-4">
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

        {/* Listed Tokens Cards */}
        {visibleTokens.length === 0 ? (
          <Card className="p-4">
            <p className="text-center text-text-secondary">No listed tokens found</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleTokens.map((token) => (
              <Card key={token.address} className="p-4 bg-background-secondary border-border relative">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{token.name} ({token.symbol})</h3>
                  <p className="text-sm text-muted-foreground">Address: {token.address}</p>
                  <p className="text-sm">Total Supply: {token.totalSupply}</p>
                  <div className="space-y-2">
                    <h4 className="font-medium">DEX Info</h4>
                    <p className="text-sm">DEX: {token.dexInfo.dexName}</p>
                    <p className="text-sm">Initial Liquidity: {token.dexInfo.initialLiquidity} ETH</p>
                    <p className="text-sm">Listing Price: {token.dexInfo.listingPrice} ETH</p>
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
    </div>
  );
});

TCAP_v2DirectDEX.displayName = 'TCAP_v2DirectDEX';

export default TCAP_v2DirectDEX; 