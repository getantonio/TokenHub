const { ethers } = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

// Uniswap V2 Contract Addresses for Sepolia
const UNISWAP_V2_ADDRESSES = {
  factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  weth: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"
};

// Event signature for PairCreated
const PAIR_CREATED_TOPIC = "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9";

// Simplified ABIs
const ERC20_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)"
];

const PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
];

// Helper function to format numbers with commas and decimal places
function formatNumber(num, decimals = 18) {
  if (typeof num !== 'string' && typeof num !== 'number' && !num?._isBigNumber) {
    return '0';
  }
  const parts = ethers.formatUnits(num, decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

// Helper function to check if an address exists and has code
async function verifyContract(provider, address) {
  const code = await provider.getCode(address);
  return code !== '0x';
}

// Helper function to compute the CREATE2 address for a pair
function computePairAddress(token0, token1, factoryAddress, initCodeHash) {
  // Sort token addresses
  const [sortedToken0, sortedToken1] = token0.toLowerCase() < token1.toLowerCase() 
    ? [token0, token1] 
    : [token1, token0];

  // Compute the pair address using CREATE2
  const salt = ethers.keccak256(
    ethers.concat([
      ethers.zeroPadValue(sortedToken0, 32),
      ethers.zeroPadValue(sortedToken1, 32)
    ])
  );

  return ethers.getCreate2Address(
    factoryAddress,
    salt,
    initCodeHash
  );
}

async function verifyPairAddress(provider, tokenAddress, pairAddress) {
  try {
    // Create pair contract
    const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
    
    // Try to get reserves - this will fail if the pair doesn't exist
    const reserves = await pair.getReserves();
    return reserves !== null;
  } catch (error) {
    console.log("Error verifying pair:", error.message);
    return false;
  }
}

async function findPairCreationEvent(provider, tokenAddress) {
  console.log("Searching for pair creation event...");
  
  try {
    // Get current block
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 200000; // Look back ~1 month
    
    console.log(`Scanning blocks ${fromBlock} to ${currentBlock}`);
    
    // Get logs for PairCreated events
    const logs = await provider.getLogs({
      address: UNISWAP_V2_ADDRESSES.factory,
      topics: [
        PAIR_CREATED_TOPIC,
        null,
        null
      ],
      fromBlock: fromBlock,
      toBlock: currentBlock
    });
    
    console.log(`Found ${logs.length} pair creation events`);
    
    // Look for our token in the events
    for (const log of logs) {
      const token0 = ethers.dataSlice(log.topics[1], 12).toLowerCase();
      const token1 = ethers.dataSlice(log.topics[2], 12).toLowerCase();
      const pairAddress = ethers.dataSlice(log.data, 0, 20).toLowerCase();
      
      if (token0 === tokenAddress.toLowerCase() || token1 === tokenAddress.toLowerCase()) {
        return {
          pairAddress,
          token0,
          token1,
          blockNumber: log.blockNumber
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error searching for pair:", error);
    return null;
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.error("Please provide a token address");
    process.exit(1);
  }

  const tokenAddress = process.argv[2].toLowerCase();
  const pairAddress = process.argv[3]?.toLowerCase();
  
  try {
    // Connect to the network
    console.log("Connecting to Sepolia network...");
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_KEY);
    const network = await provider.getNetwork();
    console.log("✓ Connected successfully");
    console.log(`Network: ${network.name}`);
    console.log(`Chain ID: ${network.chainId}\n`);

    // Get token information
    console.log(`Analyzing token: ${tokenAddress}`);
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.totalSupply()
      ]);

      console.log("\nToken Information:");
      console.log("=================");
      console.log(`Name: ${name}`);
      console.log(`Symbol: ${symbol}`);
      console.log(`Decimals: ${decimals}`);
      console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
      console.log(`Address: ${tokenAddress}`);

      // Find pair information
      let pairInfo;
      
      if (pairAddress) {
        console.log(`\nUsing provided pair address: ${pairAddress}`);
        const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
        
        try {
          const [token0, token1] = await Promise.all([
            pair.token0(),
            pair.token1()
          ]);
          
          pairInfo = {
            pairAddress,
            token0: token0.toLowerCase(),
            token1: token1.toLowerCase()
          };
          
          console.log("✓ Pair address verified");
        } catch (error) {
          console.log("❌ Could not verify pair address");
        }
      }
      
      if (!pairInfo) {
        pairInfo = await findPairCreationEvent(provider, tokenAddress);
      }

      if (!pairInfo) {
        console.log("\n⚠ No liquidity pair found for this token");
        return;
      }

      console.log(`\nPair Information:`);
      console.log("================");
      console.log(`Pair Address: ${pairInfo.pairAddress}`);
      console.log(`Token0: ${pairInfo.token0}`);
      console.log(`Token1: ${pairInfo.token1}`);
      
      // Get reserves
      const pair = new ethers.Contract(pairInfo.pairAddress, PAIR_ABI, provider);
      try {
        const reserves = await pair.getReserves();
        
        const isToken0 = tokenAddress.toLowerCase() === pairInfo.token0;
        const tokenReserve = isToken0 ? reserves[0] : reserves[1];
        const ethReserve = isToken0 ? reserves[1] : reserves[0];
        
        console.log("\nPool Reserves:");
        console.log("=============");
        console.log(`Token Reserve: ${ethers.formatUnits(tokenReserve, decimals)} ${symbol}`);
        console.log(`ETH Reserve: ${ethers.formatEther(ethReserve)} ETH`);
        console.log(`Last Updated: ${new Date(reserves[2] * 1000).toLocaleString()}`);

        // Calculate metrics
        const tokenPrice = Number(ethReserve) / Number(tokenReserve);
        const marketCap = tokenPrice * Number(ethers.formatUnits(totalSupply, decimals));

        console.log("\nMetrics:");
        console.log("========");
        console.log(`Price: ${tokenPrice.toFixed(18)} ETH per ${symbol}`);
        console.log(`Market Cap: ${marketCap.toFixed(2)} ETH`);
        
      } catch (error) {
        console.log("Error getting reserves:", error.message);
      }

    } catch (error) {
      console.error("Error getting token information:", error.message);
    }

  } catch (err) {
    console.error("\n❌ Error occurred:");
    if (err.reason) console.error("Reason:", err.reason);
    if (err.code) console.error("Code:", err.code);
    console.error("\nFull error:", err);
  }
}

main(); 