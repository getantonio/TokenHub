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
  "function factory() external view returns (address)",
  "function WETH() external view returns (address)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
  "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)"
];

// Factory ABI
const factoryABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address)",
  "function allPairs(uint) external view returns (address)",
  "function allPairsLength() external view returns (uint)",
  "function createPair(address tokenA, address tokenB) external returns (address pair)",
  "function setFeeTo(address) external",
  "function setFeeToSetter(address) external",
  "function feeTo() external view returns (address)",
  "function feeToSetter() external view returns (address)"
];

// Update pair ABI
const pairABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function price0CumulativeLast() external view returns (uint)",
  "function price1CumulativeLast() external view returns (uint)",
  "function totalSupply() external view returns (uint)",
  "function balanceOf(address) external view returns (uint)"
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

// Add Uniswap V2 Factory ABI and address
const UNISWAP_V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  "function allPairs(uint) external view returns (address pair)",
  "function allPairsLength() external view returns (uint)"
];

const UNISWAP_V2_FACTORY_ADDRESS = {
  11155111: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Sepolia
  97: "0x6725F303b657a9451d8BA641348b6761A6CC7a17" // BSC Testnet
};

// Update the factory ABI to match Uniswap V2 Factory exactly
const FACTORY_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_feeToSetter",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "token0",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token1",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "pair",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "PairCreated",
    "type": "event"
  },
  {
    "constant": true,
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "allPairs",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "allPairsLength",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenA",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenB",
        "type": "address"
      }
    ],
    "name": "createPair",
    "outputs": [
      {
        "internalType": "address",
        "name": "pair",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "feeTo",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "feeToSetter",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenA",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenB",
        "type": "address"
      }
    ],
    "name": "getPair",
    "outputs": [
      {
        "internalType": "address",
        "name": "pair",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

// Update the router ABI to match Uniswap V2 Router exactly
const ROUTER_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_factory",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_WETH",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "WETH",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "factory",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Helper function to get DEX router address
const getDexRouterAddress = async (chainId: number, dexName: string): Promise<string> => {
  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Get the factory address for the current network
    const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2DirectDEX_Bake');
    if (!factoryAddress) {
      throw new Error('Factory not configured for this network');
    }
    
    // Create factory contract instance
    const factory = new Contract(factoryAddress, factoryV2DirectDEXABI, signer);
    
    // Get router info from factory
    const routerInfo = await factory.getDEXRouter(dexName);
    if (!routerInfo.isActive) {
      throw new Error(`DEX ${dexName} is not active`);
    }
    
    return routerInfo.router;
  } catch (error) {
    console.error('Error getting DEX router:', error);
    // Fallback to hardcoded addresses if factory call fails
    const ROUTER_ADDRESSES: { [key: number]: string } = {
      11155111: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router on Sepolia
      97: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap Router on BSC Testnet
    };
    return ROUTER_ADDRESSES[chainId] || '';
  }
};

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
    try {
      setIsLoading(true);

      if (!chainId) {
        toast({
          title: "Error",
          description: "Network not supported",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Validate token address format
      if (!tokenAddress || !tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        toast({
          title: "Error",
          description: "Invalid token address format",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get factory address for current network
      const factoryAddress = UNISWAP_V2_FACTORY_ADDRESS[chainId as keyof typeof UNISWAP_V2_FACTORY_ADDRESS];
      if (!factoryAddress) {
        toast({
          title: "Error",
          description: "DEX not supported on this network",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log("Using Uniswap V2 Factory:", factoryAddress);
      console.log("Checking token:", tokenAddress);

      // Create token contract instance
      const tokenContract = new Contract(
        tokenAddress,
        erc20ABI,
        provider // Use provider instead of signer for read-only operations
      );
      
      // Get WETH address based on network
      const wethAddress = chainId === 97 
        ? "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd" // WBNB on BSC Testnet
        : "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // WETH on Sepolia

      console.log("Using WETH address:", wethAddress);

      try {
        // First verify the token contract exists and is valid
        const code = await provider.getCode(tokenAddress);
        if (code === '0x' || code === '') {
          toast({
            title: "Invalid Token",
            description: "No contract found at this address",
            variant: "destructive",
          });
          setListedToken(null);
          return;
        }

        // Get token details
        const [name, symbol, totalSupply] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.totalSupply()
        ]);

        console.log("Token details loaded:", {
          name,
          symbol,
          totalSupply: formatEther(totalSupply)
        });

        // Check if pair exists - use try-catch specifically for this call
        console.log("Checking for pair between token and WETH...");
        let pairAddress;
        try {
          // Create factory contract with the correct ABI
          const factoryContract = new Contract(
            factoryAddress,
            FACTORY_ABI,
            provider
          );
          
          console.log("Attempting to get pair...");
          // Add error handling for the getPair call
          try {
            // Ensure addresses are checksummed and valid
            const checksummedToken = getAddress(tokenAddress);
            const checksummedWeth = getAddress(wethAddress);
            console.log("Using checksummed addresses:", {
              token: checksummedToken,
              weth: checksummedWeth
            });

            pairAddress = await factoryContract.getPair(checksummedToken, checksummedWeth);
            console.log("Pair check result:", pairAddress);
          } catch (pairError: any) {
            console.error("Direct pair check failed:", pairError);
            // Try with tokens in reverse order
            const checksummedToken = getAddress(tokenAddress);
            const checksummedWeth = getAddress(wethAddress);
            console.log("Trying reverse order with checksummed addresses:", {
              weth: checksummedWeth,
              token: checksummedToken
            });

            pairAddress = await factoryContract.getPair(checksummedWeth, checksummedToken);
            console.log("Reverse pair check result:", pairAddress);
          }
          
          if (pairAddress === "0x0000000000000000000000000000000000000000") {
            console.log("No pair found - trying router method...");
            const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
            console.log("Using router address:", routerAddress);

            const routerContract = new Contract(
              routerAddress,
              ROUTER_ABI,
              provider
            );
            
            try {
              const factoryFromRouter = await routerContract.factory();
              console.log("Factory from router:", factoryFromRouter);
              
              if (factoryFromRouter && factoryFromRouter.toLowerCase() === factoryAddress.toLowerCase()) {
                const altFactoryContract = new Contract(
                  factoryFromRouter,
                  FACTORY_ABI,
                  provider
                );

                // Try both orders with the alternative factory
                const checksummedToken = getAddress(tokenAddress);
                const checksummedWeth = getAddress(wethAddress);
                
                pairAddress = await altFactoryContract.getPair(checksummedToken, checksummedWeth);
                if (pairAddress === "0x0000000000000000000000000000000000000000") {
                  pairAddress = await altFactoryContract.getPair(checksummedWeth, checksummedToken);
                }
                console.log("Pair check through router result:", pairAddress);
              }
            } catch (routerError) {
              console.error("Router method failed:", routerError);
            }
          }
        } catch (error) {
          console.error("Error getting pair:", error);
          // Try alternative method using router
          try {
            console.log("Attempting to get pair through router...");
            const routerContract = new Contract(
              '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
              ROUTER_ABI,
              provider
            );
            
            const factoryFromRouter = await routerContract.factory();
            console.log("Factory from router:", factoryFromRouter);
            
            if (factoryFromRouter.toLowerCase() === factoryAddress.toLowerCase()) {
              const altFactoryContract = new Contract(
                factoryFromRouter,
                FACTORY_ABI,
                provider
              );
              pairAddress = await altFactoryContract.getPair(tokenAddress, wethAddress);
              console.log("Pair check through router result:", pairAddress);
            }
          } catch (routerError) {
            console.error("Router check failed:", routerError);
            toast({
              title: "Error",
              description: "Failed to check pair existence. The token might not be listed.",
              variant: "destructive",
            });
            setListedToken(null);
            return;
          }
        }

        console.log("Final pair address:", pairAddress);
        
        if (!pairAddress || pairAddress === "0x0000000000000000000000000000000000000000") {
          console.log("No pair found - token is not listed");
          toast({
            title: "Not Listed",
            description: "This token is not listed on DEX yet",
            variant: "destructive",
          });
          setListedToken(null);
          return;
        }

        // Verify the pair contract exists
        const pairCode = await provider.getCode(pairAddress);
        if (pairCode === '0x' || pairCode === '') {
          toast({
            title: "Invalid Pair",
            description: "Pair contract not found. The token might be incorrectly listed.",
            variant: "destructive",
          });
          setListedToken(null);
          return;
        }

        console.log("Found valid pair address:", pairAddress);
        const pairContract = new Contract(pairAddress, pairABI, provider);
        
        // Get pair details with error handling
        console.log("Fetching pair details...");
        let token0, token1, reserves;
        try {
          [token0, token1, reserves] = await Promise.all([
            pairContract.token0(),
            pairContract.token1(),
            pairContract.getReserves()
          ]);
        } catch (error) {
          console.error("Error getting pair details:", error);
          toast({
            title: "Error",
            description: "Failed to get pair details. The pair might be invalid.",
            variant: "destructive",
          });
          setListedToken(null);
          return;
        }

        console.log("Pair details:", {
          token0,
          token1,
          reserves: reserves.map((r: bigint) => formatEther(r))
        });

        // Calculate price and format values
        const isToken0 = tokenAddress.toLowerCase() === token0.toLowerCase();
        const tokenReserve = isToken0 ? reserves[0] : reserves[1];
        const wethReserve = isToken0 ? reserves[1] : reserves[0];
        
        console.log("Calculated reserves:", {
          tokenReserve: formatEther(tokenReserve),
          wethReserve: formatEther(wethReserve),
          isToken0
        });
        
        const tokenAmount = Number(formatEther(tokenReserve));
        const wethAmount = Number(formatEther(wethReserve));
        
        if (tokenAmount === 0) {
          console.log("No liquidity found in pair");
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

        console.log("Calculated values:", {
          price,
          marketCap
        });

        // Create token info object
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

        console.log("Final token info:", token);
        setListedToken(token);
        toast({
          title: "Success",
          description: "Token details loaded successfully",
        });

      } catch (error: any) {
        console.error("Token contract error:", error);
        toast({
          title: "Error",
          description: error?.message || "Failed to load token details",
          variant: "destructive",
        });
        setListedToken(null);
      }
    } catch (error: any) {
      console.error("General error:", error);
      toast({
        title: "Error",
        description: error?.message || "An unexpected error occurred",
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