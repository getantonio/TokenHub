import { useState, useEffect, useRef, forwardRef } from 'react';
import { Contract, BrowserProvider, formatEther, Log } from 'ethers';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/components/ui/toast/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { getNetworkContractAddress } from '@/config/contracts';

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

interface TokenListedEvent extends Log {
  args: {
    token: string;
    owner: string;
    initialLiquidity?: bigint;
    listingPrice?: bigint;
  };
  blockTimestamp?: number;
}

interface TCAP_v2DirectDEXRef {
  loadTokens: () => void;
}

const TCAP_v2DirectDEX = forwardRef<TCAP_v2DirectDEXRef, Props>(({ isConnected, address: factoryAddress, provider: externalProvider }, ref) => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyRecent, setShowOnlyRecent] = useState(true);
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const displayedTokens = showOnlyRecent ? tokens.slice(0, 3) : tokens;

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
      const userAddress = await signer.getAddress();

      const factory = new Contract(factoryAddress, [
        'function isListed(address token) view returns (bool)',
        'function tokenDEX(address token) view returns (string)',
        'function getDEXRouter(string) view returns (tuple(string name, address router, bool isActive))'
      ], signer);

      // Get all token creation events
      const filter = factory.filters.TokenListed();
      const events = (await factory.queryFilter(filter)).map(event => event as unknown as TokenListedEvent);
      
      const tokenPromises = events
        .filter(event => event.args?.owner === userAddress)
        .map(async (event) => {
          const tokenAddress = event.args?.token;
          
          try {
            const tokenContract = getTokenContract(tokenAddress, signer);
            
            // Get basic token info
            const [
              name,
              symbol,
              totalSupply,
              owner,
              tradingEnabled,
              tradingStartTime,
              maxTxAmount,
              maxWalletAmount,
              dexRouter,
              dexPair,
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
              tokenContract.tradingEnabled(),
              tokenContract.tradingStartTime(),
              tokenContract.maxTxAmount(),
              tokenContract.maxWalletAmount(),
              tokenContract.dexRouter(),
              tokenContract.dexPair(),
              tokenContract.marketingFeePercentage(),
              tokenContract.developmentFeePercentage(),
              tokenContract.autoLiquidityFeePercentage(),
              tokenContract.marketingWallet(),
              tokenContract.developmentWallet()
            ]);

            // Get DEX info
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
                initialLiquidity: event.args?.initialLiquidity ? formatEther(event.args.initialLiquidity) : '0',
                listingPrice: event.args?.listingPrice ? formatEther(event.args.listingPrice) : '0'
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
              createdAt: event.blockTimestamp ? Number(event.blockTimestamp) * 1000 : Date.now()
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

  useEffect(() => {
    if (isConnected && factoryAddress && externalProvider) {
      loadTokens();
    }
  }, [isConnected, factoryAddress, externalProvider]);

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

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Your Tokens</h2>
        <Button
          variant="ghost"
          onClick={() => setShowOnlyRecent(!showOnlyRecent)}
          className="text-sm text-gray-400 hover:text-white"
        >
          {showOnlyRecent ? 'Show All' : 'Show Recent'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <Spinner className="w-6 h-6 text-blue-500" />
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-400">
          {error}
        </div>
      ) : displayedTokens.length === 0 ? (
        <Card className="p-4 text-center bg-gray-800/50 border-gray-700/50">
          <p className="text-gray-400">No tokens found. Create a new token to get started.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayedTokens.map((token) => (
            <Card key={token.address} className="p-4 bg-gray-800/50 border-gray-700/50">
              <div className="space-y-3">
                {/* Token Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-white">{token.name} ({token.symbol})</h3>
                    <p className="text-sm text-gray-400">Created: {formatDate(token.createdAt || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Total Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                    <p className="text-xs text-gray-500">Listed on: {token.dexInfo.dexName}</p>
                  </div>
                </div>

                {/* Token Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {/* Trading Info */}
                  <div className="space-y-1">
                    <h4 className="font-medium text-gray-300">Trading Settings</h4>
                    <p className="text-gray-400">Status: {token.tradingInfo.enabled ? 'Enabled' : 'Disabled'}</p>
                    <p className="text-gray-400">Max TX: {Number(token.tradingInfo.maxTxAmount).toLocaleString()} {token.symbol}</p>
                    <p className="text-gray-400">Max Wallet: {Number(token.tradingInfo.maxWalletAmount).toLocaleString()} {token.symbol}</p>
                  </div>

                  {/* Fee Info */}
                  <div className="space-y-1">
                    <h4 className="font-medium text-gray-300">Fees</h4>
                    <p className="text-gray-400">Marketing: {token.feeInfo.marketingFee}%</p>
                    <p className="text-gray-400">Development: {token.feeInfo.developmentFee}%</p>
                    <p className="text-gray-400">Auto-Liquidity: {token.feeInfo.autoLiquidityFee}%</p>
                  </div>

                  {/* DEX Info */}
                  <div className="space-y-1">
                    <h4 className="font-medium text-gray-300">Liquidity</h4>
                    <p className="text-gray-400">Initial: {Number(token.dexInfo.initialLiquidity).toFixed(4)} ETH</p>
                    <p className="text-gray-400">Listing Price: {Number(token.dexInfo.listingPrice).toFixed(8)} ETH</p>
                  </div>
                </div>

                {/* Contract Links */}
                <div className="flex gap-2 text-xs">
                  <a
                    href={`${getExplorerUrl(chainId)}/token/${token.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View Token
                  </a>
                  <a
                    href={`${getExplorerUrl(chainId)}/address/${token.dexInfo.pair}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View Pair
                  </a>
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