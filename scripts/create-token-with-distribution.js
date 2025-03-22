const { ethers } = require('ethers');
require('dotenv').config();

// Factory ABI (include only necessary functions)
const factoryABI = [
  "function deploymentFee() view returns (uint256)",
  "function createToken(tuple(string name, string symbol, uint256 initialSupply, uint256 maxSupply, address owner, bool enableBlacklist, bool enableTimeLock, bool presaleEnabled, uint256 maxActivePresales, bool enableSupplyControl, uint256 targetPrice, uint256 priceDeviationThreshold, uint256 mintLimit, uint256 burnLimit), tuple(address wallet, uint256 percentage, bool vestingEnabled, uint256 vestingDuration, uint256 cliffDuration, uint256 vestingStartTime)[]) payable returns (address)",
  "function isPaused() view returns (bool)",
  "function ownerTokens(address) view returns (address[])",
  "function totalTokensCreated() view returns (uint256)"
];

async function main() {
  try {
    // Connect to Polygon Amoy
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_URL || "https://rpc-amoy.polygon.technology");
    const provider = new ethers.JsonRpcProvider("https://polygon-amoy-rpc.publicnode.com");
    console.log("Connected to Polygon Amoy network");
    
    // Load private key from .env file
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Private key not found in .env file");
    }
    
    // Create wallet
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Using account: ${wallet.address}`);
    
    // Get account balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);
    
    // Connect to factory
    const factoryAddress = process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4 || "0x4746246BC745a3e58a3d596306F6C91266b00709";
    const factory = new ethers.Contract(factoryAddress, factoryABI, wallet);
    console.log(`\nConnected to V4 Factory at: ${factoryAddress}`);
    
    // Get factory info
    const fee = await factory.deploymentFee();
    console.log(`Deployment Fee: ${ethers.formatEther(fee)} ETH`);
    
    const paused = await factory.isPaused();
    if (paused) {
      console.log("Factory is paused. Cannot create token.");
      return;
    }
    
    // Token parameters
    const tokenParams = {
      name: "Multi-Wallet Distribution Token",
      symbol: "MWDT",
      initialSupply: ethers.parseEther("1000000"),
      maxSupply: ethers.parseEther("10000000"),
      owner: wallet.address,
      enableBlacklist: true,
      enableTimeLock: true, 
      presaleEnabled: false,
      maxActivePresales: 1,
      enableSupplyControl: true,
      targetPrice: ethers.parseEther("0.0001"),
      priceDeviationThreshold: 20,
      mintLimit: ethers.parseEther("50000"),
      burnLimit: ethers.parseEther("30000")
    };
    
    // Distribution wallets
    // Note: These should be actual addresses on the network for testing
    const wallets = [
      {
        wallet: "0x10c8c279c6b381156733ec160a89abb260bfcf0c", // Sample address 1
        percentage: 30,
        vestingEnabled: true,
        vestingDuration: 30 * 24 * 60 * 60, // 30 days in seconds
        cliffDuration: 7 * 24 * 60 * 60, // 7 days in seconds
        vestingStartTime: Math.floor(Date.now() / 1000) // Current time
      },
      {
        wallet: "0x2a97d9a5de54a407ddfb3df57d09af74c506cb21", // Sample address 2
        percentage: 20,
        vestingEnabled: true,
        vestingDuration: 90 * 24 * 60 * 60, // 90 days in seconds
        cliffDuration: 30 * 24 * 60 * 60, // 30 days in seconds
        vestingStartTime: Math.floor(Date.now() / 1000) // Current time
      },
      {
        wallet: wallet.address, // Creator's wallet gets some too
        percentage: 50,
        vestingEnabled: false,
        vestingDuration: 0,
        cliffDuration: 0,
        vestingStartTime: Math.floor(Date.now() / 1000)
      }
    ];
    
    console.log("\nToken Parameters:");
    console.log(`Name: ${tokenParams.name}`);
    console.log(`Symbol: ${tokenParams.symbol}`);
    console.log(`Initial Supply: ${ethers.formatEther(tokenParams.initialSupply)} ${tokenParams.symbol}`);
    console.log(`Max Supply: ${ethers.formatEther(tokenParams.maxSupply)} ${tokenParams.symbol}`);
    
    console.log("\nDistribution Wallets:");
    for (let i = 0; i < wallets.length; i++) {
      console.log(`\nWallet ${i+1}: ${wallets[i].wallet}`);
      console.log(`Percentage: ${wallets[i].percentage}%`);
      console.log(`Vesting Enabled: ${wallets[i].vestingEnabled}`);
      
      if (wallets[i].vestingEnabled) {
        const vestingDays = Math.floor(wallets[i].vestingDuration / (24 * 60 * 60));
        const cliffDays = Math.floor(wallets[i].cliffDuration / (24 * 60 * 60));
        
        console.log(`Vesting Duration: ${vestingDays} days`);
        console.log(`Cliff Duration: ${cliffDays} days`);
      }
    }
    
    console.log("\nCreating token...");
    
    try {
      // Create the token with distribution
      const tx = await factory.createToken(tokenParams, wallets, {
        value: fee
      });
      
      console.log(`Transaction sent: ${tx.hash}`);
      console.log("Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Find the token address from the logs
      let tokenAddress = null;
      for (const log of receipt.logs) {
        try {
          // Look for TokenCreated event which should have the token address
          const parsedLog = factory.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsedLog && parsedLog.name === "TokenCreated") {
            tokenAddress = parsedLog.args.token;
            break;
          }
        } catch (e) {
          // Not the event we're looking for
          continue;
        }
      }
      
      if (tokenAddress) {
        console.log(`\n✅ Token created successfully!`);
        console.log(`Token Address: ${tokenAddress}`);
        console.log(`View on Amoy Explorer: https://amoy.polygonscan.com/address/${tokenAddress}`);
      } else {
        console.log("Token created, but couldn't find the token address in the logs.");
      }
    } catch (error) {
      console.error("\n❌ Error creating token:", error.message);
      
      if (error.data) {
        console.error("Error data:", error.data);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main(); 