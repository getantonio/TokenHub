const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  try {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying TokenFactory_v2_DirectDEX_TwoStep with the account:", deployer.address);
    
    // Set listing fee to 0.001 ETH/BNB
    const listingFee = ethers.parseEther("0.001");
    
    // Deploy TokenFactory_v2_DirectDEX_TwoStep
    const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_TwoStep");
    const factory = await TokenFactory.deploy(listingFee);
    await factory.waitForDeployment();
    
    const factoryAddress = await factory.getAddress();
    console.log("TokenFactory_v2_DirectDEX_TwoStep deployed to:", factoryAddress);
    console.log("Listing Fee:", ethers.formatEther(listingFee), "ETH");
    
    // Get network information
    const chainId = await ethers.provider.getNetwork().then(network => network.chainId);
    let networkName;
    
    if (chainId === 11155111n) {
      networkName = "Sepolia";
    } else if (chainId === 97n) {
      networkName = "BSC Testnet";
    } else {
      networkName = "Unknown Network";
    }
    
    console.log("Network:", networkName);
    
    // Initialize the factory with the default DEX for the network
    console.log("Initializing factory with default DEX...");
    const tx = await factory.initialize();
    await tx.wait();
    console.log("Factory initialized successfully!");
    
    // Check if the contract has supported DEXes
    try {
      // Get supported DEXes count safely
      const supportedDexes = await factory.supportedDEXes();
      console.log(`Supported DEXes: ${supportedDexes.length}`);
      
      // If we have DEXes, list them
      if (supportedDexes.length > 0) {
        for (let i = 0; i < supportedDexes.length; i++) {
          try {
            const dexName = await factory.supportedDEXes(i);
            const dexInfo = await factory.dexRouters(dexName);
            console.log(`DEX ${i + 1}: ${dexName} - Router: ${dexInfo.router} - Active: ${dexInfo.isActive}`);
          } catch (error) {
            console.log(`Error retrieving DEX at index ${i}:`, error.message);
          }
        }
      } else {
        console.log("No supported DEXes found. You may need to add them manually.");
      }
    } catch (error) {
      console.log("Could not retrieve supported DEXes:", error.message);
      console.log("You may need to add DEXes manually after deployment.");
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