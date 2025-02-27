const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Starting deployment of TokenTemplate_v3_Enhanced...");

    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Get the contract factory
    const TokenFactory = await ethers.getContractFactory("TokenTemplate_v3_Enhanced");

    // Uniswap V2 Router address for Sepolia
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    // Deploy the contract
    console.log("Deploying TokenTemplate_v3_Enhanced...");
    const token = await TokenFactory.deploy(UNISWAP_V2_ROUTER);
    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();
    console.log("TokenTemplate_v3_Enhanced deployed to:", tokenAddress);

    // Initialize the token with some example parameters
    const initParams = {
      name: "Example Token",
      symbol: "EXMPL",
      initialSupply: ethers.parseEther("1000000"), // 1 million tokens
      maxSupply: ethers.parseEther("10000000"), // 10 million tokens
      owner: deployer.address,
      enableBlacklist: true,
      enableTimeLock: true,
      presaleRate: ethers.parseEther("0.0001"), // 0.0001 ETH per token
      softCap: ethers.parseEther("10"), // 10 ETH
      hardCap: ethers.parseEther("100"), // 100 ETH
      minContribution: ethers.parseEther("0.1"), // 0.1 ETH
      maxContribution: ethers.parseEther("5"), // 5 ETH
      startTime: Math.floor(Date.now() / 1000) + 3600, // Start in 1 hour
      endTime: Math.floor(Date.now() / 1000) + 86400, // End in 24 hours
      presalePercentage: 60, // 60% for presale
      liquidityPercentage: 30, // 30% for liquidity
      liquidityLockDuration: 180 * 24 * 3600, // 180 days
      walletAllocations: [
        {
          wallet: deployer.address,
          percentage: 10, // 10% for team
          vestingEnabled: true,
          vestingDuration: 365 * 24 * 3600, // 1 year
          cliffDuration: 90 * 24 * 3600, // 90 days
          vestingStartTime: Math.floor(Date.now() / 1000)
        }
      ],
      maxActivePresales: 1,
      presaleEnabled: true
    };

    console.log("Initializing token with parameters...");
    const tx = await token.initialize(initParams);
    await tx.wait();

    console.log("Token initialized successfully!");
    console.log("Token Name:", await token.name());
    console.log("Token Symbol:", await token.symbol());
    console.log("Total Supply:", ethers.formatEther(await token.totalSupply()));
    console.log("Owner:", await token.owner());

    // Verify the contract on Etherscan
    console.log("\nVerifying contract on Etherscan...");
    console.log("npx hardhat verify --network sepolia", tokenAddress, UNISWAP_V2_ROUTER);

  } catch (error) {
    console.error("Error during deployment:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 