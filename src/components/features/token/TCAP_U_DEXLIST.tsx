import { useState, useEffect, useRef, forwardRef, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, ethers, parseEther } from 'ethers';
import { getAddress, formatEther } from 'ethers';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@/components/ui/Spinner';
import { InfoIcon } from 'lucide-react';
import { getNetworkContractAddress } from '@/config/contracts';
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
  "function allPairsLength() external view returns (uint)",
  "function feeTo() external view returns (address)",
  "function feeToSetter() external view returns (address)",
  "function createPair(address tokenA, address tokenB) external returns (address pair)",
  "function setFeeTo(address) external",
  "function setFeeToSetter(address) external"
];

const FACTORY_ADDRESSES: Record<number, string> = {
  [ChainId.SEPOLIA]: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
  [ChainId.BSC_TESTNET]: '0x6725F303b657a9451d8BA641348b6761A6CC7a17'
} as const;

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

const ROUTER_ADDRESSES: Record<number, string> = {
  [ChainId.SEPOLIA]: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
  [ChainId.BSC_TESTNET]: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1'
} as const;

const getDexRouterAddress = async (chainId: number, dexName: string): Promise<string> => {
  if (!ROUTER_ADDRESSES[chainId]) {
    throw new Error(`No router address configured for chain ID ${chainId}`);
  }
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

      const chainId = await provider.getNetwork().then(network => network.chainId);
      if (!chainId) throw new Error('Could not get chain ID');

      const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
      const FACTORY_ADDRESS = FACTORY_ADDRESSES[Number(chainId)];
      if (!FACTORY_ADDRESS) {
        throw new Error('Unsupported network - Factory not found');
      }
      const ROUTER_ADDRESS = await getDexRouterAddress(Number(chainId), 'uniswap');

      console.log('Checking token details:', {
        token: tokenAddress,
        WETH: WETH_ADDRESS,
        factory: FACTORY_ADDRESS,
        router: ROUTER_ADDRESS,
        chainId: chainId.toString()
      });

      // Create token contract with full ABI
      const tokenContract = new Contract(
        tokenAddress,
        [
          ...erc20ABI,
          "function owner() view returns (address)",
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function allowance(address owner, address spender) view returns (uint256)"
        ],
        provider
      );

      // Get token details
      const [name, symbol, decimals, totalSupply, userBalance] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply(),
        tokenContract.balanceOf(await signer.getAddress())
      ]);

      console.log('Token details:', {
        name,
        symbol,
        decimals,
        totalSupply: formatEther(totalSupply),
        userBalance: formatEther(userBalance)
      });

      // Initialize variables
      let pairAddress = ethers.ZeroAddress;
      let tokenReserve = "0";
      let ethReserve = "0";
      let totalLPSupply = "0";
      let userLPBalance = "0";
      let sharePercentage = "0";
      let token0Address = "";
      let token1Address = "";

      try {
        // Create factory contract with full ABI
        const factoryContract = new Contract(
          FACTORY_ADDRESS,
          FACTORY_ABI,
          provider
        );

        // Try both token orderings
        console.log('Checking token/WETH pair...');
        pairAddress = await factoryContract.getPair(tokenAddress, WETH_ADDRESS);
        console.log('Pair address (token/WETH):', pairAddress);
        
        if (pairAddress === ethers.ZeroAddress) {
          console.log('Checking WETH/token pair...');
          pairAddress = await factoryContract.getPair(WETH_ADDRESS, tokenAddress);
          console.log('Pair address (WETH/token):', pairAddress);
        }

        // Only try to get reserves if we found a valid pair
        if (pairAddress && pairAddress !== ethers.ZeroAddress) {
          console.log('Found valid pair address:', pairAddress);
          
          const pairContract = new Contract(pairAddress, [
            "function token0() external view returns (address)",
            "function token1() external view returns (address)",
            "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function totalSupply() external view returns (uint)",
            "function balanceOf(address) external view returns (uint)"
          ], provider);

          // Get all pair details
          const [token0, token1, reserves, lpSupply, lpBalance] = await Promise.all([
            pairContract.token0(),
            pairContract.token1(),
            pairContract.getReserves(),
            pairContract.totalSupply(),
            pairContract.balanceOf(await signer.getAddress())
          ]);

          token0Address = token0;
          token1Address = token1;

          console.log('Pair details:', {
            token0,
            token1,
            reserves: reserves.map((r: ethers.BigNumberish) => formatEther(r)),
            lpSupply: formatEther(lpSupply),
            lpBalance: formatEther(lpBalance)
          });

          const isToken0 = tokenAddress.toLowerCase() === token0.toLowerCase();
          tokenReserve = formatEther(isToken0 ? reserves[0] : reserves[1]);
          ethReserve = formatEther(isToken0 ? reserves[1] : reserves[0]);
          totalLPSupply = formatEther(lpSupply);
          userLPBalance = formatEther(lpBalance);
          sharePercentage = lpSupply > 0 ? (Number(lpBalance) * 100 / Number(lpSupply)).toFixed(4) : '0';
        }
      } catch (pairError) {
        console.error('Error checking pair:', pairError);
        // Continue with the token info even if pair check fails
      }

      // Set token info based on whether we found liquidity
      const hasLiquidity = pairAddress !== ethers.ZeroAddress && Number(ethReserve) > 0;
      const tokenInfo = {
        address: tokenAddress,
        name,
        symbol,
        factoryVersion: "v2",
        isListed: hasLiquidity,
        creationTime: 0,
        listingTime: 0,
        dexName: "Uniswap V2",
        pairAddress,
        totalSupply: formatEther(totalSupply),
        liquidityAmount: ethReserve,
        listingPrice: hasLiquidity ? (Number(ethReserve) / Number(tokenReserve)).toFixed(18) : "0",
        currentPrice: hasLiquidity ? (Number(ethReserve) / Number(tokenReserve)).toFixed(18) : "0",
        marketCap: hasLiquidity ? 
          (Number(formatEther(totalSupply)) * Number(ethReserve) / Number(tokenReserve)).toFixed(2) : "0"
      };

      console.log('Final token info:', tokenInfo);
      setListedToken(tokenInfo);

      // Show appropriate toast message
      if (hasLiquidity) {
        toast({
          title: "Liquidity Pool Found",
          description: `Pair Address: ${pairAddress}
            \nToken Reserve: ${Number(tokenReserve).toFixed(4)} ${symbol}
            \nETH Reserve: ${Number(ethReserve).toFixed(4)} ETH
            \nLP Balance: ${userLPBalance} LP tokens (${sharePercentage}% of pool)
            \nToken0: ${token0Address}
            \nToken1: ${token1Address}`,
        });
      } else {
        toast({
          title: "Token Found",
          description: `${name} (${symbol}) - Total Supply: ${Number(formatEther(totalSupply)).toLocaleString()} ${symbol}
            \nYour Balance: ${Number(formatEther(userBalance)).toFixed(4)} ${symbol}
            \nNo liquidity pair has been created yet.`,
        });
      }

    } catch (error: any) {
      console.error('Error checking token:', error);
      setError(error.message || 'Failed to check token');
      toast({
        title: "Error",
        description: error.message || 'Failed to check token',
        variant: "destructive"
      });
      setListedToken(null);
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
      const FACTORY_ADDRESS = FACTORY_ADDRESSES[chainId];
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
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter token address"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="flex-1 bg-gray-900 text-white border-gray-700 px-4 py-2 h-10"
        />
        <Button
          onClick={handleSearch}
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
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  listedToken.isListed 
                    ? 'bg-green-600/10 text-green-400'
                    : 'bg-yellow-600/10 text-yellow-400'
                }`}>
                  {listedToken.isListed 
                    ? `Listed on ${listedToken.dexName}`
                    : 'Not Listed Yet'}
                </span>
                <Button
                  onClick={() => handleCheckBalance(listedToken.address)}
                  className="text-xs h-6 px-2 bg-gray-700 hover:bg-gray-600"
                >
                  Check Balance
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-secondary">Total Supply:</p>
                <p className="text-text-primary">
                  {Number(listedToken.totalSupply).toLocaleString()} {listedToken.symbol}
                </p>
              </div>
              {listedToken.isListed ? (
                <>
                  <div>
                    <p className="text-text-secondary">Liquidity:</p>
                    <p className="text-text-primary">
                      {Number(listedToken.liquidityAmount).toLocaleString()} {chainId ? getNetworkCurrency(chainId) : 'ETH'}
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
                </>
              ) : (
                <div className="col-span-2 bg-yellow-500/5 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">This token has not been listed on {listedToken.dexName} yet.</p>
                  <p className="text-yellow-400/80 text-xs mt-1">No liquidity pair has been created.</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => chainId && window.open(`${getExplorerUrl(chainId)}/token/${listedToken.address}`, '_blank')}
                className="flex-1 h-8 text-xs bg-gray-700 hover:bg-gray-600"
              >
                View on Explorer
              </Button>
              
              <Button
                onClick={() => handleMintOrTransfer(listedToken.address)}
                className="flex-1 h-8 text-xs bg-gray-700 hover:bg-gray-600"
              >
                Mint/Transfer
              </Button>
              
              {listedToken.isListed ? (
                <>
                  <Button
                    onClick={() => chainId && window.open(`${getDexUrl(chainId)}${listedToken.address}`, '_blank')}
                    className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    Trade on {listedToken.dexName}
                  </Button>
                  <Button
                    onClick={handleCreatePair}
                    className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                    disabled={isLoading}
                  >
                    Add More Liquidity
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleCreatePair}
                  className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner className="w-4 h-4" /> : 'Create Liquidity Pair'}
                </Button>
              )}
            </div>

            <Button
              onClick={handleCheckLPDetails}
              className="text-xs h-6 px-2 bg-gray-700 hover:bg-gray-600"
            >
              Check LP Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TCAP_U_DEXLIST;