import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Contract, BrowserProvider, formatEther, getAddress } from 'ethers';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@/components/ui/Spinner';
import { useNetwork } from '@/contexts/NetworkContext';
import { InfoIcon } from 'lucide-react';
import { getNetworkContractAddress } from '@/config/contracts';
import { Input } from '@/components/ui/input';

interface TokenBase {
  address: string;
  name: string;
  symbol: string;
  factoryVersion: string;
  isListed: boolean;
  creationTime: number;
  listingTime: number;
  dexName: string;
}

interface ListedToken extends TokenBase {
  pairAddress: string;
  totalSupply: string;
  liquidityAmount: string;
  listingPrice: string;
  currentPrice: string;
  marketCap: string;
}

// Router ABI for PancakeSwap/Uniswap
const routerABI = [
  "function factory() external pure returns (address)",
  "function WETH() external pure returns (address)",
  "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)"
];

// Factory ABI
const factoryABI = [
  "function getPair(address tokenA, address tokenB) view returns (address)"
];

// Pair ABI
const pairABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
];

// ERC20 ABI
const erc20ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

// Update factory ABI to match the actual contract functions
const factoryV2DirectDEXABI = [
  "function getDeployedTokens() external view returns (address[])",
  "function tokenInfo(address) external view returns (tuple(address token, address owner, bool isListed, string dexName, uint256 creationTime, uint256 listingTime))",
  "function isListed(address token) external view returns (bool)",
  "function getSupportedDEXes() external view returns (string[])",
  "function getDEXRouter(string) external view returns (tuple(string name, address router, bool isActive))"
];

const TCAP_U_DEXLIST = () => {
  const { address: userAddress } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [listedToken, setListedToken] = useState<ListedToken | null>(null);

  // Helper function to get network currency
  const getNetworkCurrency = (chainId: number): string => {
    switch (chainId) {
      case 97:
        return 'BNB';
      case 11155111:
        return 'ETH';
      default:
        return 'ETH';
    }
  };

  // Helper function to get DEX router address
  const getDexRouterAddress = (chainId: number): string => {
    const ROUTER_ADDRESSES: { [key: number]: string } = {
      11155111: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router on Sepolia
      97: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap Router on BSC Testnet
    };
    return ROUTER_ADDRESSES[chainId] || '';
  };

  // Helper function to get explorer URL
  const getExplorerUrl = (chainId: number): string => {
    switch (chainId) {
      case 97:
        return 'https://testnet.bscscan.com';
      case 11155111:
        return 'https://sepolia.etherscan.io';
      default:
        return '';
    }
  };

  // Helper function to get DEX URL
  const getDexUrl = (chainId: number): string => {
    switch (chainId) {
      case 97:
        return 'https://pancakeswap.finance/?chain=bscTestnet&outputCurrency=';
      case 11155111:
        return 'https://app.uniswap.org/#';
      default:
        return '';
    }
  };

  // Add this new helper function after other helper functions
  const getChartUrl = (chainId: number, pairAddress: string): string => {
    switch (chainId) {
      case 97: // BSC Testnet
        return `https://pancakeswap.finance/?chain=bscTestnet&outputCurrency=${pairAddress}`;
      case 11155111: // Sepolia
        return `https://info.uniswap.org/#/sepolia/pools/${pairAddress}`;
      default:
        // For BSC Testnet, you can also use these alternative chart viewers:
        // return `https://dexscreener.com/bsc-testnet/${pairAddress}`;
        // return `https://www.dextools.io/app/bsc/pair-explorer/${pairAddress}`;
        return `https://pancakeswap.finance/?chain=bscTestnet&outputCurrency=${pairAddress}`;
    }
  };

  const loadTokenDetails = async () => {
    if (!chainId || !tokenAddress) {
      toast({
        title: "Input Required",
        description: "Please enter a token address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);

      // Get router contract
      const routerAddress = getDexRouterAddress(chainId);
      const routerContract = new Contract(routerAddress, routerABI, provider);
      
      // Get factory and WETH addresses
      const [factoryAddress, wethAddress] = await Promise.all([
        routerContract.factory(),
        routerContract.WETH()
      ]);

      // Create factory contract
      const dexFactory = new Contract(factoryAddress, factoryABI, provider);

      // Create token contract
      const tokenContract = new Contract(tokenAddress, erc20ABI, provider);
      
      // Get token details
      const [name, symbol, totalSupply] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.totalSupply()
      ]);

      // Check if pair exists
      const pairAddress = await dexFactory.getPair(tokenAddress, wethAddress);
      
      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        toast({
          title: "Not Listed",
          description: "This token is not listed on DEX yet",
          variant: "destructive",
        });
        setListedToken(null);
        return;
      }

      const pairContract = new Contract(pairAddress, pairABI, provider);
      const [token0, token1, reserves] = await Promise.all([
        pairContract.token0(),
        pairContract.token1(),
        pairContract.getReserves()
      ]);

      // Calculate price
      const isToken0 = tokenAddress.toLowerCase() === token0.toLowerCase();
      const tokenReserve = isToken0 ? reserves[0] : reserves[1];
      const wethReserve = isToken0 ? reserves[1] : reserves[0];
      
      const tokenAmount = Number(formatEther(tokenReserve)) || 0;
      const wethAmount = Number(formatEther(wethReserve)) || 0;
      
      if (tokenAmount === 0) {
        toast({
          title: "No Liquidity",
          description: "This pair has no liquidity",
          variant: "destructive",
        });
        setListedToken(null);
        return;
      }
      
      const price = wethAmount / tokenAmount;
      const marketCap = Number(formatEther(totalSupply)) * price;

      const token: ListedToken = {
        address: tokenAddress,
        name,
        symbol,
        factoryVersion: 'v2',
        isListed: true,
        creationTime: Math.floor(Date.now() / 1000),
        listingTime: Math.floor(Date.now() / 1000),
        dexName: chainId === 97 ? 'PancakeSwap' : 'Uniswap',
        pairAddress,
        totalSupply: formatEther(totalSupply),
        liquidityAmount: formatEther(tokenReserve),
        listingPrice: price.toFixed(18),
        currentPrice: price.toFixed(18),
        marketCap: marketCap.toFixed(2)
      };

      setListedToken(token);
      toast({
        title: "Success",
        description: "Token details loaded successfully",
      });

    } catch (error) {
      console.error('Error loading token:', error);
      toast({
        title: "Error",
        description: "Failed to load token details. Please check the address and try again.",
        variant: "destructive",
      });
      setListedToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter token address"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="flex-1 bg-gray-900 text-white border-gray-700 px-4 py-2 h-10"
        />
        <Button
          onClick={loadTokenDetails}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-10"
          disabled={isLoading || !tokenAddress}
        >
          {isLoading ? <Spinner /> : 'Load Token'}
        </Button>
      </div>

      {listedToken && (
        <div className="p-4 bg-background-secondary rounded-lg border border-border hover:border-blue-500 transition-colors">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-text-primary">{listedToken.name} ({listedToken.symbol})</h4>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-text-secondary break-all">{listedToken.address}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(listedToken.address)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <InfoIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <span className="px-2 py-1 bg-green-600/10 text-green-400 rounded text-sm">
                Listed on {listedToken.dexName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-secondary">Total Supply:</p>
                <p className="text-text-primary">
                  {Number(listedToken.totalSupply).toLocaleString()} {listedToken.symbol}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">Liquidity:</p>
                <p className="text-text-primary">
                  {Number(listedToken.liquidityAmount).toLocaleString()} {listedToken.symbol}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">Current Price:</p>
                <p className="text-text-primary">
                  {listedToken.currentPrice} {chainId ? getNetworkCurrency(chainId) : 'ETH'}
                </p>
              </div>
              <div>
                <p className="text-text-secondary">Market Cap:</p>
                <p className="text-text-primary">
                  {listedToken.marketCap} {chainId ? getNetworkCurrency(chainId) : 'ETH'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-text-secondary">Pair Address:</p>
                <p className="text-text-primary break-all">{listedToken.pairAddress}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => chainId && window.open(`${getExplorerUrl(chainId)}/token/${listedToken.address}`, '_blank')}
                className="flex-1 h-8 text-xs bg-gray-700 hover:bg-gray-600"
              >
                View on Explorer
              </Button>
              <Button
                onClick={() => chainId && window.open(`${getDexUrl(chainId)}${listedToken.address}`, '_blank')}
                className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
              >
                Trade on {listedToken.dexName}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TCAP_U_DEXLIST; 