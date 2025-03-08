// Use JavaScript require style imports for hardhat
const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  try {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying TokenFactory_v2_DirectDEX_Fixed with the account:", deployer.address);
    
    // Set listing fee to 0.001 ETH/BNB
    const listingFee = ethers.parseEther("0.001");
    
    // Deploy simplified TokenFactory
    const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_Fixed");
    const factory = await TokenFactory.deploy(listingFee);
    
    await factory.waitForDeployment();
    
    const factoryAddress = await factory.getAddress();
    console.log("TokenFactory_v2_DirectDEX_Fixed deployed to:", factoryAddress);
    console.log("Listing Fee:", ethers.formatEther(listingFee), "ETH");
    
    // Get and display the default router
    const defaultRouter = await factory.defaultRouter();
    console.log("Default DEX Router:", defaultRouter);
    
    // Get network information
    const chainId = await ethers.provider.getNetwork().then(network => network.chainId);
    let networkName;
    
    if (chainId === 11155111n) {
      networkName = "Sepolia";
      console.log("Network: Sepolia");
      console.log("Using Uniswap V2 Router");
    } else if (chainId === 97n) {
      networkName = "BSC Testnet";
      console.log("Network: BSC Testnet");
      console.log("Using PancakeSwap Router");
    } else {
      networkName = "Unknown Network";
      console.log(`Network: Unknown (Chain ID: ${chainId})`);
    }
    
    // Instructions for verification
    console.log("\nTo verify the contract on Etherscan/BscScan:");
    console.log(`npx hardhat verify --network ${networkName.toLowerCase().replace(' ', '')} ${factoryAddress} ${listingFee}`);
    
  } catch (error) {
    console.error("Error during deployment:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 