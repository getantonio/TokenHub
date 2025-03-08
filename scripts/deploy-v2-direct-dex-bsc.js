// Specific deployment script for TokenFactory_v2_DirectDEX_Fixed on BSC Testnet
const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  try {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying TokenFactory_v2_DirectDEX_Fixed to BSC Testnet with account:", deployer.address);
    
    // Set listing fee to 0.001 BNB
    const listingFee = ethers.parseEther("0.001");
    
    // Deploy simplified TokenFactory
    const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_Fixed");
    const factory = await TokenFactory.deploy(listingFee);
    
    await factory.waitForDeployment();
    
    const factoryAddress = await factory.getAddress();
    console.log("TokenFactory_v2_DirectDEX_Fixed deployed to BSC Testnet at:", factoryAddress);
    console.log("Listing Fee:", ethers.formatEther(listingFee), "BNB");
    
    // Get and display the default router
    const defaultRouter = await factory.defaultRouter();
    console.log("Default DEX Router:", defaultRouter);
    
    // Display network info
    const chainId = await ethers.provider.getNetwork().then(network => network.chainId);
    console.log("Network: BSC Testnet (Chain ID:", chainId.toString(), ")");
    console.log("Using PancakeSwap Router");
    
    // Instructions for verification
    console.log("\nTo verify the contract on BscScan:");
    console.log(`npx hardhat verify --network bscTestnet ${factoryAddress} ${listingFee}`);
    
    // Note for updating environment variables
    console.log("\nIMPORTANT: Add this to your .env.local file:");
    console.log(`NEXT_PUBLIC_BSCTESTNET_V2_DIRECTDEX_FIXED_ADDRESS=${factoryAddress}`);
    
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