import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Contract, BrowserProvider, formatEther, getAddress } from 'ethers';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@/components/ui/Spinner';
import { useNetwork } from '@/contexts/NetworkContext';
import { InfoIcon } from 'lucide-react';
import { getNetworkContractAddress } from '@/config/contracts';

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
  const [listedTokens, setListedTokens] = useState<ListedToken[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("0x7afEe619Ed1299B0E0c24DB81D78f947f61Cab0A");

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

  const getUserTokens = async (provider: BrowserProvider, userAddress: string): Promise<TokenBase[]> => {
    if (!chainId) return [];

    try {
      // Get factory address from your contracts config - using TwoStep factory
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2DirectDEX_TwoStep');
      if (!factoryAddress) {
        console.error('No factory address found for chain:', chainId);
        return [];
      }

      console.log('Using factory address:', factoryAddress);

      // Create factory contract instance with checksummed address
      const factoryContract = new Contract(getAddress(factoryAddress), factoryV2DirectDEXABI, provider);

      // Get all tokens using getDeployedTokens()
      const tokens = await factoryContract.getDeployedTokens();
      console.log('Found tokens:', tokens);

      // Get details for each token
      const tokenDetails = await Promise.all(
        tokens.map(async (address: string) => {
          try {
            // Get token info from factory first
            const info = await factoryContract.tokenInfo(address);
            
            // Only process tokens owned by the user
            if (info.owner.toLowerCase() !== userAddress.toLowerCase()) {
              return null;
            }

            // Use checksummed address
            const checksummedAddress = getAddress(address);
            const tokenContract = new Contract(checksummedAddress, erc20ABI, provider);
            
            // Get token details and listing status
            const [name, symbol, isListed] = await Promise.all([
              tokenContract.name(),
              tokenContract.symbol(),
              factoryContract.isListed(checksummedAddress)
            ]);

            return {
              address: checksummedAddress,
              name,
              symbol,
              factoryVersion: 'v2',
              isListed,
              creationTime: Number(info.creationTime),
              listingTime: Number(info.listingTime),
              dexName: info.dexName
            };
          } catch (error) {
            console.error('Error getting token details for address', address, ':', error);
            return null;
          }
        })
      );

      // Filter out any null values from failed token fetches
      return tokenDetails.filter((token): token is TokenBase => token !== null);
    } catch (error: any) {
      console.error('Error getting user tokens:', error);
      if (error.code === 'CALL_EXCEPTION') {
        console.error('Contract call failed. This might be due to an incorrect contract address or ABI.');
      }
      return [];
    }
  };

  const loadListedTokens = async () => {
    if (!chainId || !userAddress) {
      toast({
        title: "Connection Required",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);

      // Get router contract
      const routerAddress = getDexRouterAddress(chainId);
      console.log('Using DEX router:', routerAddress);
      const routerContract = new Contract(routerAddress, routerABI, provider);
      
      // Get factory and WETH addresses
      const [factoryAddress, wethAddress] = await Promise.all([
        routerContract.factory(),
        routerContract.WETH()
      ]);
      console.log('PancakeSwap Factory:', factoryAddress);
      console.log('WBNB Address:', wethAddress);

      // First get your tokens from the token factory
      const factoryV2Address = getNetworkContractAddress(chainId, 'factoryAddressV2DirectDEX_TwoStep');
      if (!factoryV2Address) {
        console.error('No factory address found for chain:', chainId);
        return;
      }

      // Create factory contract instances
      const tokenFactory = new Contract(factoryV2Address, factoryV2DirectDEXABI, provider);
      const dexFactory = new Contract(factoryAddress, factoryABI, provider);

      // Get all your tokens
      let userTokens: TokenBase[] = [];
      try {
        const tokens = await tokenFactory.getDeployedTokens();
        console.log('Found tokens in factory:', tokens);

        // Get details for each token
        const tokenDetails = await Promise.all(
          tokens.map(async (address: string) => {
            try {
              const info = await tokenFactory.tokenInfo(address);
              if (info.owner.toLowerCase() !== userAddress.toLowerCase()) {
                return null;
              }

              const tokenContract = new Contract(address, erc20ABI, provider);
              const [name, symbol] = await Promise.all([
                tokenContract.name(),
                tokenContract.symbol()
              ]);

              return {
                address,
                name,
                symbol,
                factoryVersion: 'v2',
                isListed: info.isListed,
                creationTime: Number(info.creationTime),
                listingTime: Number(info.listingTime),
                dexName: info.dexName
              };
            } catch (error) {
              console.error('Error getting token details:', error);
              return null;
            }
          })
        );

        userTokens = tokenDetails.filter((token): token is TokenBase => token !== null);
        console.log('Found user tokens:', userTokens);
      } catch (error) {
        console.error('Error getting tokens from factory:', error);
      }

      // Now check each token for PancakeSwap pairs
      const listedTokensData = await Promise.all(
        userTokens.map(async (token) => {
          try {
            console.log(`Checking pair for token ${token.symbol} (${token.address})`);
            
            // Check if pair exists
            const pairAddress = await dexFactory.getPair(token.address, wethAddress);
            console.log('Pair address found:', pairAddress);

            if (pairAddress === "0x0000000000000000000000000000000000000000") {
              console.log(`No pair exists for token ${token.symbol}`);
              return null;
            }

            const pairContract = new Contract(pairAddress, pairABI, provider);
            const [token0, token1, reserves] = await Promise.all([
              pairContract.token0(),
              pairContract.token1(),
              pairContract.getReserves()
            ]);

            const tokenContract = new Contract(token.address, erc20ABI, provider);
            const totalSupply = await tokenContract.totalSupply();

            // Calculate price
            const isToken0 = token.address.toLowerCase() === token0.toLowerCase();
            const tokenReserve = isToken0 ? reserves[0] : reserves[1];
            const wethReserve = isToken0 ? reserves[1] : reserves[0];
            
            const tokenAmount = Number(formatEther(tokenReserve)) || 0;
            const wethAmount = Number(formatEther(wethReserve)) || 0;
            
            if (tokenAmount === 0) return null;
            
            const price = wethAmount / tokenAmount;
            const totalSupplyFormatted = formatEther(totalSupply);
            const totalSupplyNumber = Number(totalSupplyFormatted) || 0;
            const marketCap = totalSupplyNumber * price;

            return {
              ...token,
              pairAddress,
              totalSupply: totalSupplyFormatted,
              liquidityAmount: formatEther(tokenReserve),
              listingPrice: price.toFixed(18),
              currentPrice: price.toFixed(18),
              marketCap: marketCap.toFixed(2)
            } as ListedToken;
          } catch (error) {
            console.error('Error checking pair:', error);
            return null;
          }
        })
      );

      // Filter out null values and sort by market cap
      const validTokens = listedTokensData
        .filter((token): token is ListedToken => token !== null)
        .sort((a, b) => Number(b.marketCap) - Number(a.marketCap));

      console.log('Found listed tokens:', validTokens);
      setListedTokens(validTokens);
      setHasLoadedOnce(true);

    } catch (error) {
      console.error('Error loading listed tokens:', error);
      toast({
        title: "Error",
        description: "Failed to load listed tokens",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSpecificToken = async (address: string) => {
    if (!chainId) {
      toast({
        title: "Connection Required",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);

      // Get router contract
      const routerAddress = getDexRouterAddress(chainId);
      console.log('Using DEX router:', routerAddress);
      const routerContract = new Contract(routerAddress, routerABI, provider);
      
      // Get factory and WETH addresses
      const [factoryAddress, wethAddress] = await Promise.all([
        routerContract.factory(),
        routerContract.WETH()
      ]);
      console.log('PancakeSwap Factory:', factoryAddress);
      console.log('WBNB Address:', wethAddress);

      // Create factory contract instances
      const dexFactory = new Contract(factoryAddress, factoryABI, provider);
      const tokenContract = new Contract(address, erc20ABI, provider);

      // Get token details
      console.log('Getting details for token:', address);
      const [name, symbol, totalSupply] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.totalSupply()
      ]);

      // Check if pair exists
      const pairAddress = await dexFactory.getPair(address, wethAddress);
      console.log('Pair address found:', pairAddress);

      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        console.log('No pair exists for this token');
        toast({
          title: "No Pair Found",
          description: "This token does not have a liquidity pair on PancakeSwap.",
          variant: "destructive",
        });
        return;
      }

      const pairContract = new Contract(pairAddress, pairABI, provider);
      const [token0, token1, reserves] = await Promise.all([
        pairContract.token0(),
        pairContract.token1(),
        pairContract.getReserves()
      ]);

      // Calculate price
      const isToken0 = address.toLowerCase() === token0.toLowerCase();
      const tokenReserve = isToken0 ? reserves[0] : reserves[1];
      const wethReserve = isToken0 ? reserves[1] : reserves[0];
      
      const tokenAmount = Number(formatEther(tokenReserve)) || 0;
      const wethAmount = Number(formatEther(wethReserve)) || 0;
      
      if (tokenAmount === 0) {
        toast({
          title: "No Liquidity",
          description: "This pair has no liquidity.",
          variant: "destructive",
        });
        return;
      }
      
      const price = wethAmount / tokenAmount;
      const totalSupplyFormatted = formatEther(totalSupply);
      const totalSupplyNumber = Number(totalSupplyFormatted) || 0;
      const marketCap = totalSupplyNumber * price;

      const tokenInfo: ListedToken = {
        address,
        name,
        symbol,
        factoryVersion: 'v2',
        isListed: true,
        creationTime: Math.floor(Date.now() / 1000),
        listingTime: Math.floor(Date.now() / 1000),
        dexName: chainId === 97 ? 'PancakeSwap' : 'Uniswap',
        pairAddress,
        totalSupply: totalSupplyFormatted,
        liquidityAmount: formatEther(tokenReserve),
        listingPrice: price.toFixed(18),
        currentPrice: price.toFixed(18),
        marketCap: marketCap.toFixed(2)
      };

      console.log('Token details:', tokenInfo);
      setListedTokens([tokenInfo]);
      setHasLoadedOnce(true);

      toast({
        title: "Success",
        description: "Token details loaded successfully.",
      });

    } catch (error) {
      console.error('Error loading token details:', error);
      toast({
        title: "Error",
        description: "Failed to load token details. Please check the address and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="Enter token address"
            className="flex-1 px-3 py-2 bg-background-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={() => loadSpecificToken(tokenAddress)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading || !tokenAddress}
          >
            {isLoading ? <Spinner /> : 'Load Token'}
          </Button>
        </div>

        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-text-primary">Listed Tokens</h3>
          <Button
            onClick={loadListedTokens}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? <Spinner /> : hasLoadedOnce ? 'Refresh All' : 'Load All Tokens'}
          </Button>
        </div>
      </div>

      {!hasLoadedOnce ? (
        <div className="text-center py-8 bg-background-secondary rounded-lg border border-border">
          <p className="text-text-secondary">Click the button above to load your listed tokens.</p>
        </div>
      ) : listedTokens.length === 0 ? (
        <div className="text-center py-8 bg-background-secondary rounded-lg border border-border">
          <p className="text-text-secondary">No tokens listed on DEX yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {listedTokens.map((token) => (
            <div
              key={token.address}
              className="p-4 bg-background-secondary rounded-lg border border-border hover:border-blue-500 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-text-primary">{token.name} ({token.symbol})</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-text-secondary break-all">{token.address}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(token.address)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <InfoIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-1 bg-blue-600/10 text-blue-400 rounded text-sm">
                      {token.factoryVersion}
                    </span>
                    {token.isListed && (
                      <span className="px-2 py-1 bg-green-600/10 text-green-400 rounded text-sm">
                        Listed on {token.dexName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-text-secondary">Total Supply:</p>
                    <p className="text-text-primary">
                      {Number(token.totalSupply).toLocaleString()} {token.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Liquidity:</p>
                    <p className="text-text-primary">
                      {Number(token.liquidityAmount).toLocaleString()} {token.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Current Price:</p>
                    <p className="text-text-primary">
                      {token.currentPrice} {chainId ? getNetworkCurrency(chainId) : 'ETH'}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Market Cap:</p>
                    <p className="text-text-primary">
                      {token.marketCap} {chainId ? getNetworkCurrency(chainId) : 'ETH'}
                    </p>
                  </div>
                  {token.isListed && (
                    <>
                      <div>
                        <p className="text-text-secondary">Listed On:</p>
                        <p className="text-text-primary">
                          {new Date(token.listingTime * 1000).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-secondary">Created On:</p>
                        <p className="text-text-primary">
                          {new Date(token.creationTime * 1000).toLocaleString()}
                        </p>
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <p className="text-text-secondary">Pair Address:</p>
                    <p className="text-text-primary break-all">{token.pairAddress}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => chainId && window.open(`${getExplorerUrl(chainId)}/token/${token.address}`, '_blank')}
                    className="flex-1 h-8 text-xs bg-gray-700 hover:bg-gray-600"
                  >
                    View on Explorer
                  </Button>
                  {token.isListed && (
                    <Button
                      onClick={() => chainId && window.open(`${getDexUrl(chainId)}${token.address}`, '_blank')}
                      className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      Trade on {token.dexName}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TCAP_U_DEXLIST; 