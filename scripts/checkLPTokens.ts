const { ethers } = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

// ABIs
const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)"
];

const PAIR_ABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() external view returns (uint)",
  "function balanceOf(address) external view returns (uint)"
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

async function main() {
  // Check if token address is provided
  const tokenAddress = process.argv[2];
  if (!tokenAddress) {
    console.error("Please provide a token address as an argument");
    process.exit(1);
  }

  // Constants for Sepolia
  const WETH_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
  const FACTORY_ADDRESS = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  
  // Check if RPC URL is provided
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    console.error("Error: SEPOLIA_RPC_URL is not set in .env");
    process.exit(1);
  }

  // Connect to provider
  let provider;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    await provider.getNetwork(); // Test the connection
    console.log("Successfully connected to Sepolia network");
  } catch (err) {
    console.error("Failed to connect to the network. Please check your RPC URL and internet connection.");
    process.exit(1);
  }
  
  try {
    console.log(`\nChecking token: ${tokenAddress}`);
    
    // Create token contract instance
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    // Get token info
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
      tokenContract.totalSupply()
    ]).catch((err) => {
      throw new Error(`Failed to get token information: ${err.message}`);
    });

    console.log("\nToken Information:");
    console.log("=================");
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);
    console.log(`Address: ${tokenAddress}`);

    // Create factory contract instance
    const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
    
    console.log("\nChecking liquidity pair...");
    
    // Get pair address
    const pairAddress = await factoryContract.getPair(tokenAddress, WETH_ADDRESS)
      .catch((err) => {
        throw new Error(`Failed to get pair address: ${err.message}`);
      });
    
    if (pairAddress === ethers.ZeroAddress) {
      console.log("\nNo liquidity pair exists for this token");
      return;
    }

    console.log("\nLiquidity Pair Information:");
    console.log("==========================");
    console.log(`Pair Address: ${pairAddress}`);

    // Create pair contract instance
    const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
    
    // Get pair details
    const [token0, token1, reserves, totalLPSupply] = await Promise.all([
      pairContract.token0(),
      pairContract.token1(),
      pairContract.getReserves(),
      pairContract.totalSupply()
    ]).catch((err) => {
      throw new Error(`Failed to get pair details: ${err.message}`);
    });

    const isToken0 = tokenAddress.toLowerCase() === token0.toLowerCase();
    const tokenReserve = isToken0 ? reserves[0] : reserves[1];
    const ethReserve = isToken0 ? reserves[1] : reserves[0];

    console.log(`\nPool Reserves:`);
    console.log(`Token Reserve: ${ethers.formatEther(tokenReserve)} ${symbol}`);
    console.log(`ETH Reserve: ${ethers.formatEther(ethReserve)} ETH`);
    console.log(`Total LP Supply: ${ethers.formatEther(totalLPSupply)} LP`);

    // If wallet address is provided as second argument, check LP balance
    const walletAddress = process.argv[3];
    if (walletAddress) {
      console.log(`\nChecking LP balance for wallet: ${walletAddress}`);
      const lpBalance = await pairContract.balanceOf(walletAddress)
        .catch((err) => {
          throw new Error(`Failed to get LP balance: ${err.message}`);
        });
      const sharePercentage = (Number(lpBalance) * 100) / Number(totalLPSupply);
      
      console.log(`\nWallet LP Information (${walletAddress}):`);
      console.log(`LP Balance: ${ethers.formatEther(lpBalance)} LP`);
      console.log(`Pool Share: ${sharePercentage.toFixed(4)}%`);
    }

  } catch (err) {
    if (err instanceof Error) {
      console.error("Error:", err.message);
    } else {
      console.error("An unknown error occurred");
    }
    process.exit(1);
  }
}

main().catch((err) => {
  if (err instanceof Error) {
    console.error("Fatal error:", err.message);
  } else {
    console.error("An unknown fatal error occurred");
  }
  process.exit(1); 