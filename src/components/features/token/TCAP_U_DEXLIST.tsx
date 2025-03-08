import { useState, useEffect, useRef, forwardRef, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, ethers, parseEther } from 'ethers';
import { getAddress, formatEther } from 'ethers';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@/components/ui/Spinner';
import { InfoIcon } from 'lucide-react';
import { getNetworkContractAddress, FACTORY_ADDRESSES_V2_DIRECT_DEX_FIXED } from '@/config/contracts';
import { Input } from '@/components/ui/input';
import { ChainId } from '@/types/chain';

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

// Add after the ListedToken interface
interface TokenBalance {
  raw: ethers.BigNumberish;
  formatted: string;
}

// Add this interface for token allocation info
interface TokenAllocation {
  tokenAmount: string;
  vestingEnabled: boolean;
  vestingDuration: number;
  cliffDuration: number;
  vestingStartTime: number;
  tokensClaimed: string;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  liquidityInfo?: {
    hasLiquidity?: boolean;
    lpTokenBalance?: string;
    totalSupply?: string;
    reserves?: {
      token: string;
      eth: string;
    };
    pairAddress?: string;
  };
}

interface Props {
  isConnected: boolean;
  address?: string;
  provider: any;  // This is externalProvider
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
const factoryV2DirectDEXFixedABI = [
  "function tokenInfo(address) external view returns (tuple(address token, address owner, bool isListed, uint256 creationTime, uint256 listingTime))",
  "function isListed(address token) external view returns (bool)",
  "function getTokenInfo(address token) external view returns (tuple(address token, address owner, bool isListed, uint256 creationTime, uint256 listingTime))",
  "function defaultRouter() external view returns (address)"
];

// Add Uniswap V2 Factory ABI and address
const UNISWAP_V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  "function allPairs(uint) external view returns (address pair)",
  "function allPairsLength() external view returns (uint)",
  "function feeTo() external view returns (address)",
  "function feeToSetter() external view returns (address)",
  "function createPair(address tokenA, address tokenB) external returns (address pair)",
  "function setFeeTo(address) external",
  "function setFeeToSetter(address) external"
];

// Update the router addresses to match the v3 config
const ROUTER_ADDRESSES: Record<number, string> = {
  [ChainId.SEPOLIA]: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router on Sepolia
  [ChainId.BSC_TESTNET]: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap Router on BSC Testnet
  // Add other network router addresses as needed
} as const;

// Update the factory addresses to match our newly deployed fixed contract
const FACTORY_ADDRESSES_V2_DIRECT_DEX = FACTORY_ADDRESSES_V2_DIRECT_DEX_FIXED;

// Update the factory contract ABI
const FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_feeToSetter", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA", "type": "address" },
      { "internalType": "address", "name": "tokenB", "type": "address" }
    ],
    "name": "getPair",
    "outputs": [{ "internalType": "address", "name": "pair", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const tokenV3ABI = [
  ...erc20ABI,
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const getDexRouterAddress = async (chainId: number, dexName: string): Promise<string> => {
  if (!ROUTER_ADDRESSES[chainId]) {
    throw new Error(`No router address configured for chain ID ${chainId}`);
  }
  // Always return the network's default router address
  return ROUTER_ADDRESSES[chainId];
};

const getNetworkCurrency = (chainId: number): string => {
  switch (chainId) {
    case 97: // BSC Testnet
      return 'BNB';
    case 11155111: // Sepolia
      return 'ETH';
    case 80002: // Polygon Mumbai
      return 'MATIC';
    case 11155420: // Optimism Sepolia
      return 'ETH';
    default:
      return 'ETH';
  }
};

const getExplorerUrl = (chainId: number): string => {
  switch (chainId) {
    case 97: // BSC Testnet
      return 'https://testnet.bscscan.com';
    case 11155111: // Sepolia
      return 'https://sepolia.etherscan.io';
    case 80002: // Polygon Mumbai
      return 'https://mumbai.polygonscan.com';
    case 11155420: // Optimism Sepolia
      return 'https://sepolia-optimism.etherscan.io';
    default:
      return '';
  }
};

const getDexUrl = (chainId: number): string => {
  switch (chainId) {
    case 97: // BSC Testnet
      return 'https://pancakeswap.finance/swap?outputCurrency=';
    case 11155111: // Sepolia
      return 'https://app.uniswap.org/swap?chain=sepolia&outputCurrency=';
    case 80002: // Polygon Mumbai
      return 'https://quickswap.exchange/#/swap?outputCurrency=';
    case 11155420: // Optimism Sepolia
      return 'https://app.uniswap.org/swap?chain=optimism_sepolia&outputCurrency=';
    default:
      return '';
  }
};

// Add getFactoryAddressV2DirectDEX function 
const getFactoryAddressV2DirectDEX = (chainId: number): string => {
  if (!FACTORY_ADDRESSES_V2_DIRECT_DEX[chainId]) {
    throw new Error(`No v2 Direct DEX factory address configured for chain ID ${chainId}`);
  }
  return FACTORY_ADDRESSES_V2_DIRECT_DEX[chainId];
};

// Add a function to get the V2 DirectDEX Fixed factory address
const getFactoryAddressV2DirectDEXFixed = (chainId: number): string => {
  // First try to get it from our constant
  if (FACTORY_ADDRESSES_V2_DIRECT_DEX_FIXED[chainId]) {
    return FACTORY_ADDRESSES_V2_DIRECT_DEX_FIXED[chainId];
  }
  
  // If not found in the constant, try the contract resolution system
  return getNetworkContractAddress(chainId, 'factoryAddressV2DirectDEX_Fixed');
};

// Add a special handling function for Direct DEX Factory Fixed addresses
function getDirectDEXFactoryAddress(chainId: number): string {
  if (chainId === ChainId.SEPOLIA) {
    console.log("Using hardcoded Sepolia Direct DEX factory address");
    return '0xF78Facc20c24735066B2c962B6Fa58d4234Ed8F3';
  } else if (chainId === ChainId.BSC_TESTNET) {
    console.log("Using hardcoded BSC Testnet Direct DEX factory address");
    return '0xE1469497243ce0A7f5d26f81c34E9eFA5975569b'; // New dedicated address
  }
  
  // If not a known network, try to use the address from context or return null
  return FACTORY_ADDRESSES_V2_DIRECT_DEX_FIXED[chainId] || '';
}

const TCAP_U_DEXLIST = () => {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<ListedToken[]>([]);
  const [tokenAddress, setTokenAddress] = useState("");
  const [listedToken, setListedToken] = useState<ListedToken | null>(null);

  const handleSearch = async () => {
    if (!tokenAddress) return;

    try {
      setIsLoading(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const networkId = await provider.getNetwork().then(network => Number(network.chainId));
      if (!networkId) throw new Error('Could not get network ID');

      // Get the appropriate WETH address for the current network
      let WETH_ADDRESS;
      if (networkId === ChainId.SEPOLIA) {
        WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'; // Sepolia WETH
      } else if (networkId === ChainId.BSC_TESTNET) {
        WETH_ADDRESS = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'; // BSC Testnet WBNB
      } else {
        throw new Error(`Unsupported network: ${networkId}`);
      }

      // Get the factory address for the current network - use our special handler for guaranteed address
      const FACTORY_ADDRESS = getDirectDEXFactoryAddress(networkId);
      console.log(`Using factory address for network ${networkId}: ${FACTORY_ADDRESS}`);
      if (!FACTORY_ADDRESS) {
        throw new Error(`No v2 DirectDEX Fixed factory address found for network ID ${networkId}`);
      }

      // Get the router address
      const routerAddress = await getDexRouterAddress(networkId, "");

      // Create contracts
      const tokenContract = new Contract(tokenAddress, erc20ABI, signer);
      const factoryContract = new Contract(FACTORY_ADDRESS, factoryV2DirectDEXFixedABI, signer);
      const routerContract = new Contract(routerAddress, routerABI, signer);

      // Fetch token info
      const tokenInfo = await factoryContract.getTokenInfo(tokenAddress);
      if (!tokenInfo || tokenInfo.token === "0x0000000000000000000000000000000000000000") {
        throw new Error("Token not found in factory");
      }

      // Fetch DEX router info if token is listed
      let pairAddress = "0x0000000000000000000000000000000000000000";
      let reserves = { token: "0", eth: "0" };
      let lpTokenBalance = "0";
      let pairTotalSupply = "0";

      try {
        const [name, symbol, decimals, tokenTotalSupply] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.totalSupply()
        ]);

        // Only fetch pair data if token is listed
        if (tokenInfo.isListed) {
          // Get router address directly from the factory
          const routerAddress = await factoryContract.defaultRouter();
          const router = new Contract(routerAddress, routerABI, signer);
          const factoryAddress = await router.factory();
          const uniswapFactory = new Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, signer);
          
          // Get pair address
          pairAddress = await uniswapFactory.getPair(tokenAddress, WETH_ADDRESS);
          
          if (pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000") {
            // Get reserves
            const pairContract = new Contract(pairAddress, pairABI, signer);
            const [token0, reserves0, pairSupply, lpBalance] = await Promise.all([
              pairContract.token0(),
              pairContract.getReserves(),
              pairContract.totalSupply(),
              pairContract.balanceOf(await signer.getAddress())
            ]);
            
            pairTotalSupply = pairSupply.toString();
            lpTokenBalance = lpBalance.toString();
            
            // Determine which reserve is token and which is ETH
            const isToken0 = token0.toLowerCase() === tokenAddress.toLowerCase();
            reserves = {
              token: isToken0 ? reserves0[0].toString() : reserves0[1].toString(),
              eth: isToken0 ? reserves0[1].toString() : reserves0[0].toString()
            };
          }
        }

        // Calculate current price if listed and has liquidity
        let currentPrice = "0";
        let marketCap = "0";
        let dexName = "Unknown DEX";

        // Get DEX name based on network
        if (networkId === ChainId.SEPOLIA) {
          dexName = "UniswapV2";
        } else if (networkId === ChainId.BSC_TESTNET) {
          dexName = "PancakeSwap";
        }

        if (tokenInfo.isListed && reserves.token !== "0" && reserves.eth !== "0") {
          const tokenReserve = ethers.getBigInt(reserves.token);
          const ethReserve = ethers.getBigInt(reserves.eth);
          if (tokenReserve !== ethers.getBigInt("0")) {
            // Use String-based BigInt construction for compatibility with older JavaScript versions
            const scalingFactor = ethers.getBigInt("1000000000000000000"); // 10^18
            currentPrice = formatEther(ethReserve * scalingFactor / tokenReserve);
            marketCap = (parseFloat(formatEther(tokenTotalSupply)) * parseFloat(currentPrice)).toFixed(6);
          }
        }

        // Add to listed tokens
        const formattedToken: ListedToken = {
          address: tokenAddress,
          name: name,
          symbol: symbol,
          factoryVersion: "v2 Direct DEX Fixed",
          isListed: tokenInfo.isListed,
          creationTime: Number(tokenInfo.creationTime),
          listingTime: Number(tokenInfo.listingTime),
          dexName: dexName,
          pairAddress: pairAddress,
          totalSupply: formatEther(tokenTotalSupply),
          liquidityAmount: reserves.token !== "0" ? formatEther(reserves.token) : "0",
          listingPrice: "0", // Not stored in contract
          currentPrice: currentPrice,
          marketCap: marketCap
        };

        setListedToken(formattedToken);
        // Update tokens list if not already present
        setTokens(prevTokens => {
          const exists = prevTokens.some(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
          if (!exists) {
            return [formattedToken, ...prevTokens];
          }
          return prevTokens.map(t => t.address.toLowerCase() === tokenAddress.toLowerCase() ? formattedToken : t);
        });

      } catch (err) {
        console.error("Error fetching token details:", err);
        throw new Error(`Failed to fetch token details: ${err instanceof Error ? err.message : String(err)}`);
      }

    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : String(err));
      toast({
        title: "Search Failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePair = async () => {
    if (!listedToken || !chainId) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Get addresses for the current network
      const WETH_ADDRESS = chainId === 11155111 
        ? '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9' // Sepolia WETH
        : '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'; // BSC Testnet WETH

      const ROUTER_ADDRESS = chainId === 11155111
        ? '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' // Uniswap V2 Router on Sepolia
        : '0xD99D1c33F9fC3444f8101754aBC46c52416550D1'; // PancakeSwap Router on BSC Testnet

      // Create token contract with additional functions for liquidity
      const tokenContract = new Contract(listedToken.address, [
        ...tokenV3ABI,
        "function owner() view returns (address)",
        "function getLiquidityAllocation() view returns (uint256)",
        "function liquidityWallet() view returns (address)"
      ], signer);

      // Check if user is owner
      const owner = await tokenContract.owner();
      const isOwner = owner.toLowerCase() === userAddress.toLowerCase();

      if (!isOwner) {
        throw new Error('Only the token owner can add initial liquidity');
      }

      // Try to get liquidity allocation from contract
      let availableLiquidity;
      try {
        availableLiquidity = await tokenContract.getLiquidityAllocation();
      } catch (error) {
        console.log('getLiquidityAllocation not found, checking liquidity wallet...');
        try {
          const liquidityWallet = await tokenContract.liquidityWallet();
          availableLiquidity = await tokenContract.balanceOf(liquidityWallet);
        } catch (error) {
          console.log('liquidityWallet not found, checking contract balance...');
          availableLiquidity = await tokenContract.balanceOf(listedToken.address);
        }
      }

      console.log('Available liquidity:', formatEther(availableLiquidity));

      if (availableLiquidity <= 0) {
        throw new Error('No tokens available for liquidity in the contract');
      }

      // Show dialog to get amounts
      const dialog = await new Promise<{ tokenAmount: string; ethAmount: string } | null>((resolve) => {
        const dialog = document.createElement('dialog');
        dialog.className = 'bg-gray-900 rounded-lg p-6 max-w-md w-full border border-border';
        dialog.innerHTML = `
          <h3 class="text-lg font-bold text-text-primary mb-4">Add Initial Liquidity</h3>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary">Token Amount (${listedToken.symbol})</label>
              <input type="text" id="tokenAmount" class="w-full bg-gray-800 text-text-primary rounded px-2 py-1 text-sm" placeholder="Enter token amount" />
              <p class="text-xs text-gray-400 mt-1">Available in Contract: ${formatEther(availableLiquidity)} ${listedToken.symbol}</p>
            </div>
            <div>
              <label class="text-xs text-text-secondary">ETH Amount</label>
              <input type="text" id="ethAmount" class="w-full bg-gray-800 text-text-primary rounded px-2 py-1 text-sm" placeholder="Enter ETH amount" />
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button id="cancelBtn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-text-primary">Cancel</button>
            <button id="confirmBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">Add Liquidity</button>
          </div>
        `;
        
        document.body.appendChild(dialog);
        dialog.showModal();

        const cancelBtn = dialog.querySelector('#cancelBtn');
        const confirmBtn = dialog.querySelector('#confirmBtn');
        const tokenAmountInput = dialog.querySelector<HTMLInputElement>('#tokenAmount');
        const ethAmountInput = dialog.querySelector<HTMLInputElement>('#ethAmount');

        if (cancelBtn && confirmBtn && tokenAmountInput && ethAmountInput) {
          cancelBtn.addEventListener('click', () => {
            dialog.close();
            resolve(null);
          });

          confirmBtn.addEventListener('click', () => {
            dialog.close();
            resolve({
              tokenAmount: tokenAmountInput.value,
              ethAmount: ethAmountInput.value
            });
          });
        } else {
          dialog.close();
          resolve(null);
        }
      });

      if (!dialog) return;

      const { tokenAmount, ethAmount } = dialog;
      if (!tokenAmount || !ethAmount) {
        throw new Error('Please enter both token and ETH amounts');
      }

      // Convert amounts to proper units
      const tokenAmountWei = parseEther(tokenAmount);
      const ethAmountWei = parseEther(ethAmount);

      // Check if amount is within available liquidity
      if (tokenAmountWei > availableLiquidity) {
        throw new Error(`Insufficient liquidity tokens. Available: ${formatEther(availableLiquidity)} ${listedToken.symbol}`);
      }

      // Check and update allowance if needed
      const currentAllowance = await tokenContract.allowance(listedToken.address, ROUTER_ADDRESS);
      if (currentAllowance < tokenAmountWei) {
        console.log('Approving router...');
        const approveTx = await tokenContract.approve(ROUTER_ADDRESS, ethers.MaxUint256);
        await approveTx.wait();
        
        toast({
          title: 'Approval Successful',
          description: 'Router approved to spend tokens'
        });
      }

      // Create router contract
      const routerContract = new Contract(ROUTER_ADDRESS, [
        "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)"
      ], signer);

      // Add liquidity
      console.log('Adding liquidity with params:', {
        token: listedToken.address,
        tokenAmount: formatEther(tokenAmountWei),
        ethAmount: formatEther(ethAmountWei)
      });

      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
      const addLiquidityTx = await routerContract.addLiquidityETH(
        listedToken.address,
        tokenAmountWei,
        0, // Accept any amount of tokens
        0, // Accept any amount of ETH
        userAddress, // LP tokens go to the owner
        deadline,
        { value: ethAmountWei }
      );

      toast({
        title: 'Transaction Submitted',
        description: 'Adding liquidity... Please wait for confirmation.'
      });

      await addLiquidityTx.wait();
      console.log('Liquidity added successfully');

      toast({
        title: 'Success',
        description: 'Liquidity added successfully'
      });

      // Refresh token data
      handleSearch();

    } catch (error: any) {
      console.error('Error creating pair:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add liquidity',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add new function for minting/transferring tokens
  const handleMintOrTransfer = async (tokenAddress: string) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Create token contract instance for minting/transferring
      const mintTokenContract = new Contract(
        tokenAddress,
        [
          ...erc20ABI,
          "function owner() view returns (address)",
          "function mint(address to, uint256 amount) returns (bool)",
          "function transfer(address to, uint256 amount) returns (bool)",
          "function balanceOf(address) view returns (uint256)"
        ],
        signer
      );
      
      // Create dialog for input
      const dialog = await new Promise<{ toAddress: string; amount: string } | null>((resolve) => {
        const dialog = document.createElement('dialog');
        dialog.className = 'bg-gray-900 rounded-lg p-6 max-w-md w-full border border-border';
        dialog.innerHTML = `
          <h3 class="text-lg font-bold text-text-primary mb-4">Mint or Transfer Tokens</h3>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary">To Address</label>
              <input type="text" id="toAddress" class="w-full bg-gray-800 text-text-primary rounded px-2 py-1 text-sm" placeholder="Enter recipient address" />
            </div>
            <div>
              <label class="text-xs text-text-secondary">Amount</label>
              <input type="text" id="amount" class="w-full bg-gray-800 text-text-primary rounded px-2 py-1 text-sm" placeholder="Enter amount" />
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button id="cancelBtn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-text-primary">Cancel</button>
            <button id="confirmBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">Mint or Transfer</button>
          </div>
        `;
        
        document.body.appendChild(dialog);
        dialog.showModal();

        const cancelBtn = dialog.querySelector('#cancelBtn');
        const confirmBtn = dialog.querySelector('#confirmBtn');
        const toAddressInput = dialog.querySelector<HTMLInputElement>('#toAddress');
        const amountInput = dialog.querySelector<HTMLInputElement>('#amount');

        if (cancelBtn && confirmBtn && toAddressInput && amountInput) {
          cancelBtn.addEventListener('click', () => {
            dialog.close();
            resolve(null);
          });

          confirmBtn.addEventListener('click', () => {
            dialog.close();
            resolve({
              toAddress: toAddressInput.value,
              amount: amountInput.value
            });
          });
        } else {
          dialog.close();
          resolve(null);
        }
      });

      if (!dialog) return;

      const { toAddress, amount } = dialog;
      if (!toAddress || !amount) {
        throw new Error('Please enter both recipient address and amount');
      }

      // Convert amount to proper units
      const amountWei = parseEther(amount);

      // Check if user is owner
      const owner = await mintTokenContract.owner();
      const isOwner = owner.toLowerCase() === userAddress.toLowerCase();

      if (!isOwner) {
        throw new Error('Only the token owner can mint or transfer tokens');
      }

      // Mint or transfer tokens
      if (toAddress === userAddress) {
        console.log('Minting tokens...');
        const mintTx = await mintTokenContract.mint(userAddress, amountWei);
        await mintTx.wait();
        toast({
          title: 'Tokens Minted',
          description: `Successfully minted ${amount} ${listedToken?.symbol} to your wallet`
        });
      } else {
        console.log('Transferring tokens...');
        const transferTx = await mintTokenContract.transfer(toAddress, amountWei);
        await transferTx.wait();
        toast({
          title: 'Tokens Transferred',
          description: `Successfully transferred ${amount} ${listedToken?.symbol} to ${toAddress}`
        });
      }

      // Refresh token data
      handleSearch();

    } catch (error: any) {
      console.error('Error in mint/transfer:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mint/transfer tokens',
        variant: 'destructive'
      });
    }
  };

  const handleCheckLPDetails = async () => {
    if (!listedToken || !chainId) {
      toast({
        title: "Error",
        description: "No token selected or chain not connected",
        variant: "destructive"
      });
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      console.log('Checking LP details for:', listedToken.address);
      
      // Get the correct factory address for the current network
      const FACTORY_ADDRESS = FACTORY_ADDRESSES_V2_DIRECT_DEX[chainId];
      if (!FACTORY_ADDRESS) {
        toast({
          title: "Error",
          description: "Unsupported network - Factory not found",
          variant: "destructive"
        });
        return;
      }
      
      const WETH_SEPOLIA = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
      
      console.log('Using factory address:', FACTORY_ADDRESS);
      
      // Create factory contract with proper ABI
      const factoryContract = new Contract(
        FACTORY_ADDRESS,
        FACTORY_ABI,
        signer
      );
      
      // Check pair address both ways
      let pairAddress = await factoryContract.getPair(listedToken.address, WETH_SEPOLIA);
      console.log('First pair check:', pairAddress);
      
      if (pairAddress === ethers.ZeroAddress) {
        pairAddress = await factoryContract.getPair(WETH_SEPOLIA, listedToken.address);
        console.log('Second pair check:', pairAddress);
      }
      
      if (pairAddress === ethers.ZeroAddress) {
        toast({
          title: "No Liquidity Pool",
          description: "This token doesn't have a liquidity pool yet.",
          variant: "destructive"
        });
        return;
      }
      
      // Create pair contract
      const lpContract = new Contract(
        pairAddress,
        [
          'function token0() external view returns (address)',
          'function token1() external view returns (address)',
          'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
          'function totalSupply() external view returns (uint)',
          'function balanceOf(address) external view returns (uint)'
        ],
        signer
      );
      
      // Get pair details
      const userAddress = await signer.getAddress();
      const [token0, reserves, totalSupply, lpBalance] = await Promise.all([
        lpContract.token0(),
        lpContract.getReserves(),
        lpContract.totalSupply(),
        lpContract.balanceOf(userAddress)
      ]);
      
      // Calculate reserves
      const isToken0 = listedToken.address.toLowerCase() === token0.toLowerCase();
      const tokenReserve = isToken0 ? reserves[0] : reserves[1];
      const ethReserve = isToken0 ? reserves[1] : reserves[0];
      
      // Update UI with LP details
      toast({
        title: "Liquidity Pool Details",
        description: `Pair Address: ${pairAddress}\nTotal LP Supply: ${formatEther(totalSupply)} LP\nYour LP Balance: ${formatEther(lpBalance)} LP\nToken Reserve: ${formatEther(tokenReserve)}\nETH Reserve: ${formatEther(ethReserve)}`,
        variant: "default"
      });
      
      // Calculate price and market cap
      const ethReserveFormatted = formatEther(ethReserve);
      const tokenReserveFormatted = formatEther(tokenReserve);
      const price = Number(ethReserveFormatted) / Number(tokenReserveFormatted);
      const marketCap = price * Number(listedToken.totalSupply);
      
      // Update token info with type safety
      setListedToken({
        ...listedToken,
        isListed: true,
        pairAddress,
        liquidityAmount: ethReserveFormatted,
        currentPrice: price.toString(),
        marketCap: marketCap.toString()
      });
      
    } catch (error) {
      console.error('Error checking LP details:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check LP details",
        variant: "destructive"
      });
    }
  };

  const handleCheckBalance = async (tokenAddress: string) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create token contract instance for balance checking
      const balanceTokenContract = new Contract(
        tokenAddress,
        [
          "function balanceOf(address) view returns (uint256)",
          "function decimals() view returns (uint8)",
          "function symbol() view returns (string)"
        ],
        signer
      );

      // Rest of the balance checking logic...
    } catch (error) {
      console.error('Error checking balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to check balance',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col space-y-1.5">
          <h2 className="text-xl font-semibold">Token Lookup</h2>
          <p className="text-sm text-muted-foreground">
            Enter a token address to view its details and liquidity pool information.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Enter token address"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="flex-grow"
          />
          <Button 
            onClick={handleSearch}
            disabled={isLoading || !tokenAddress}
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : "Search"}
          </Button>
        </div>
        
        {error && (
          <div className="bg-destructive/15 p-3 rounded-md text-destructive flex items-start gap-2">
            <InfoIcon className="h-5 w-5 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        
        {listedToken && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg">{listedToken.name} ({listedToken.symbol})</h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="font-medium">Token Address:</span> {listedToken.address}</p>
                  <p><span className="font-medium">Total Supply:</span> {parseFloat(listedToken.totalSupply).toLocaleString()} {listedToken.symbol}</p>
                  <p><span className="font-medium">Factory Version:</span> {listedToken.factoryVersion}</p>
                  <p><span className="font-medium">Created:</span> {new Date(listedToken.creationTime * 1000).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg">Liquidity Information</h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="font-medium">Listed:</span> {listedToken.isListed ? 'Yes' : 'No'}</p>
                  {listedToken.isListed && (
                    <>
                      <p><span className="font-medium">DEX:</span> {listedToken.dexName}</p>
                      <p><span className="font-medium">Listed At:</span> {new Date(listedToken.listingTime * 1000).toLocaleString()}</p>
                      <p><span className="font-medium">Pair Address:</span> {listedToken.pairAddress}</p>
                      <p><span className="font-medium">Liquidity:</span> {parseFloat(listedToken.liquidityAmount).toLocaleString()} {listedToken.symbol}</p>
                      <p><span className="font-medium">Current Price:</span> {parseFloat(listedToken.currentPrice).toFixed(8)} {chainId ? getNetworkCurrency(chainId) : 'ETH'}</p>
                      <p><span className="font-medium">Market Cap:</span> {parseFloat(listedToken.marketCap).toLocaleString()} {chainId ? getNetworkCurrency(chainId) : 'ETH'}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (chainId) {
                    window.open(`${getExplorerUrl(chainId)}/address/${listedToken.address}`, '_blank');
                  }
                }}
              >
                View on Explorer
              </Button>
              
              {listedToken.isListed && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (chainId) {
                      window.open(`${getDexUrl(chainId)}${listedToken.address}`, '_blank');
                    }
                  }}
                >
                  Trade on {listedToken.dexName}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TCAP_U_DEXLIST;