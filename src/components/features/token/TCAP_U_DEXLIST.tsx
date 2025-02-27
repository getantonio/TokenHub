import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, ethers, parseEther } from 'ethers';
import { getAddress, formatEther } from 'ethers';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
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

const UNISWAP_V2_FACTORY_ADDRESS = {
  11155111: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Sepolia
  97: "0x6725F303b657a9451d8BA641348b6761A6CC7a17", // BSC Testnet
  11155420: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" // Optimism Sepolia
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

// Update the token ABI to only include essential functions
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
      const FACTORY_ADDRESS = '0x7E0987E5b3a30e3f2828572Bb659A548460a3003';
      const ROUTER_ADDRESS = await getDexRouterAddress(Number(chainId), 'uniswap');

      console.log('Checking token details:', {
        token: tokenAddress,
        WETH: WETH_ADDRESS,
        factory: FACTORY_ADDRESS,
        router: ROUTER_ADDRESS
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
          [
            "function getPair(address tokenA, address tokenB) external view returns (address pair)",
            "function allPairs(uint) external view returns (address pair)",
            "function allPairsLength() external view returns (uint)"
          ],
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
      
      // Create token contract with minimal ABI
      const tokenContract = new Contract(tokenAddress, [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function owner() view returns (address)",
        "function mint(address to, uint256 amount) returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address) view returns (uint256)"
      ], signer);
      
      // Create dialog for input
      const dialog = await new Promise<{ toAddress: string; amount: string } | null>((resolve) => {
        const dialog = document.createElement('dialog');
        dialog.className = 'bg-gray-900 rounded-lg p-6 max-w-md w-full border border-border';
        dialog.innerHTML = `
          <h3 class="text-lg font-bold text-text-primary mb-4">Mint or Transfer Tokens</h3>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary">Recipient Address</label>
              <input type="text" id="toAddress" class="w-full bg-gray-800 text-text-primary rounded px-2 py-1 text-sm" placeholder="Enter recipient address" value="${userAddress}" />
            </div>
            <div>
              <label class="text-xs text-text-secondary">Amount</label>
              <input type="text" id="amount" class="w-full bg-gray-800 text-text-primary rounded px-2 py-1 text-sm" placeholder="Enter amount" />
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button id="cancelBtn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-text-primary">Cancel</button>
            <button id="confirmBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">Continue</button>
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

      // Get token info
      const [decimals, symbol, owner, balance] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol(),
        tokenContract.owner(),
        tokenContract.balanceOf(userAddress)
      ]);

      // Convert amount to proper units
      const amountInWei = parseEther(amount);
      const isOwner = owner.toLowerCase() === userAddress.toLowerCase();

      if (isOwner) {
        try {
          console.log('Attempting to mint tokens...');
          
          // Estimate gas first to check if the transaction will fail
          const gasEstimate = await tokenContract.mint.estimateGas(toAddress, amountInWei)
            .catch(err => {
              throw new Error(`Cannot mint tokens: ${err.message}`);
            });
            
          console.log('Gas estimate:', gasEstimate.toString());
          
          // Add 20% buffer to gas estimate
          const gasLimit = gasEstimate + (gasEstimate / BigInt(5));
          
          // Show pending toast
          toast({
            title: 'Transaction Pending',
            description: `Minting ${amount} ${symbol} to ${toAddress}...`
          });
          
          // Send transaction with gas limit
          const mintTx = await tokenContract.mint(toAddress, amountInWei, {
            gasLimit
          });
          
          // Show waiting toast
          toast({
            title: 'Transaction Submitted',
            description: `Transaction hash: ${mintTx.hash}`
          });
          
          // Wait for confirmation
          await mintTx.wait();
          
          toast({
            title: 'Success',
            description: `Successfully minted ${amount} ${symbol} to ${toAddress}`
          });
          
          handleSearch();
          return;
        } catch (error: any) {
          console.log('Could not mint tokens:', error);
          // If minting fails, try transfer instead
          toast({
            title: 'Minting Failed',
            description: `Could not mint tokens: ${error.message}. Trying transfer instead...`
          });
        }
      }

      // If minting fails or user is not owner, try transfer
      if (balance >= amountInWei) {
        // Estimate gas first
        const gasEstimate = await tokenContract.transfer.estimateGas(toAddress, amountInWei)
          .catch(err => {
            throw new Error(`Cannot transfer tokens: ${err.message}`);
          });
          
        // Add 20% buffer to gas estimate
        const gasLimit = gasEstimate + (gasEstimate / BigInt(5));
        
        // Show pending toast
        toast({
          title: 'Transaction Pending',
          description: `Transferring ${amount} ${symbol} to ${toAddress}...`
        });
        
        const transferTx = await tokenContract.transfer(toAddress, amountInWei, {
          gasLimit
        });
        
        // Show waiting toast
        toast({
          title: 'Transaction Submitted',
          description: `Transaction hash: ${transferTx.hash}`
        });
        
        await transferTx.wait();
        
        toast({
          title: 'Success',
          description: `Successfully transferred ${amount} ${symbol} to ${toAddress}`
        });
        
        handleSearch();
      } else {
        throw new Error(`Insufficient balance. You have ${formatEther(balance)} ${symbol}`);
      }

    } catch (error: any) {
      console.error('Error in mint/transfer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mint/transfer tokens',
        variant: 'destructive'
      });
    }
  };

  // Helper function to get network currency
  const getNetworkCurrency = (chainId: number): string => {
    switch (chainId) {
      case 97:
        return 'BNB';
      case 11155111:
        return 'ETH';
      case 80002:
        return 'MATIC';
      case 11155420:
        return 'ETH'; // Optimism Sepolia
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
      case 80002:
        return '';
      case 11155420:
        return 'https://sepolia-optimism.etherscan.io';
      default:
        return '';
    }
  };

  // Helper function to get DEX URL
  const getDexUrl = (chainId: number): string => {
    switch (chainId) {
      case 97:
        return 'https://pancakeswap.finance/?chain=bscTestnet&outputCurrency=';
      case 11155111: // Sepolia
        return 'https://app.uniswap.org/swap?chain=sepolia';
      case 11155420: // Optimism Sepolia
        return 'https://app.uniswap.org/swap?chain=optimism_sepolia';
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
        return `https://app.uniswap.org/pools?chain=sepolia`;
      case 11155420: // Optimism Sepolia
        return `https://app.uniswap.org/pools?chain=optimism_sepolia`;
      default:
        return `https://app.uniswap.org/pools`;
    }
  };

  // Add after the existing helper functions
  const checkTokenBalance = async (tokenAddress: string, signer: any): Promise<TokenBalance> => {
    const tokenContract = new Contract(tokenAddress, [
      ...erc20ABI,
      "function decimals() view returns (uint8)"
    ], signer);
    
    const [balance, decimals] = await Promise.all([
      tokenContract.balanceOf(await signer.getAddress()),
      tokenContract.decimals()
    ]);

    return {
      raw: balance,
      formatted: formatEther(balance)
    };
  };

  // Add this function after checkTokenBalance
  const getLPTokenDetails = async (tokenAddress: string, signer: any): Promise<{
    pairAddress: string;
    lpBalance: string;
    totalSupply: string;
    reserves: { token: string; eth: string };
  }> => {
    // Get WETH address for Sepolia
    const WETH_ADDRESS = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';
    const FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';

    // Create factory contract
    const factoryContract = new Contract(
      FACTORY_ADDRESS,
      ["function getPair(address,address) external view returns (address)"],
      signer
    );

    // Get pair address
    const pairAddress = await factoryContract.getPair(tokenAddress, WETH_ADDRESS);
    
    if (pairAddress === ethers.ZeroAddress) {
      return {
        pairAddress: ethers.ZeroAddress,
        lpBalance: "0",
        totalSupply: "0",
        reserves: { token: "0", eth: "0" }
      };
    }

    // Create pair contract
    const pairContract = new Contract(
      pairAddress,
      [
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function totalSupply() external view returns (uint)",
        "function balanceOf(address) external view returns (uint)"
      ],
      signer
    );

    // Get all pair details
    const [token0, reserves, totalSupply, userAddress] = await Promise.all([
      pairContract.token0(),
      pairContract.getReserves(),
      pairContract.totalSupply(),
      signer.getAddress()
    ]);

    const lpBalance = await pairContract.balanceOf(userAddress);
    
    const isToken0 = tokenAddress.toLowerCase() === token0.toLowerCase();
    const tokenReserve = isToken0 ? reserves[0] : reserves[1];
    const ethReserve = isToken0 ? reserves[1] : reserves[0];

    return {
      pairAddress,
      lpBalance: formatEther(lpBalance),
      totalSupply: formatEther(totalSupply),
      reserves: {
        token: formatEther(tokenReserve),
        eth: formatEther(ethReserve)
      }
    };
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
                  onClick={async () => {
                    try {
                      const provider = new BrowserProvider(window.ethereum);
                      const signer = await provider.getSigner();
                      const balance = await checkTokenBalance(listedToken.address, signer);
                      toast({
                        title: "Your Balance",
                        description: `${Number(balance.formatted).toLocaleString()} ${listedToken.symbol}`,
                      });
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: "Failed to fetch balance",
                        variant: "destructive"
                      });
                    }
                  }}
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
              onClick={async () => {
                try {
                  const provider = new BrowserProvider(window.ethereum);
                  const signer = await provider.getSigner();
                  const lpDetails = await getLPTokenDetails(listedToken.address, signer);
                  
                  if (lpDetails.pairAddress === ethers.ZeroAddress) {
                    toast({
                      title: "No Liquidity Pool",
                      description: "This token doesn't have a liquidity pool yet.",
                      variant: "destructive"
                    });
                    return;
                  }

                  toast({
                    title: "Liquidity Pool Details",
                    description: `Total LP Supply: ${Number(lpDetails.totalSupply).toLocaleString()} LP
                      \nYour LP Balance: ${Number(lpDetails.lpBalance).toLocaleString()} LP
                      \nToken Reserve: ${Number(lpDetails.reserves.token).toLocaleString()} ${listedToken.symbol}
                      \nETH Reserve: ${Number(lpDetails.reserves.eth).toLocaleString()} ETH`,
                  });
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: "Failed to fetch LP details",
                    variant: "destructive"
                  });
                }
              }}
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