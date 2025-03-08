const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Set listing fee to 0.001 ETH/BNB
  const listingFee = ethers.parseEther("0.001");
  
  // Deploy TokenFactory_v2_DirectDEX_Fixed
  console.log("Deploying TokenFactory_v2_DirectDEX_Fixed...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_Fixed");
  const factory = await TokenFactory.deploy(listingFee);
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("TokenFactory_v2_DirectDEX_Fixed deployed to:", factoryAddress);
  console.log("Listing Fee:", ethers.formatEther(listingFee), "ETH");
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  let networkName;
  
  if (chainId === 11155111) {
    networkName = "sepolia";
    console.log("Network: Sepolia");
  } else if (chainId === 97) {
    networkName = "bsctestnet";
    console.log("Network: BSC Testnet");
  } else {
    networkName = "unknown";
    console.log(`Network: Unknown (Chain ID: ${chainId})`);
  }
  
  // Get and verify the default router
  const defaultRouter = await factory.defaultRouter();
  console.log("Default DEX Router:", defaultRouter);
  
  // Try to create a test token to validate
  console.log("\nAttempting to create a test token to validate deployment...");
  
  try {
    // Test token parameters with minimal values
    const testParams = {
      name: "TestDeployment",
      symbol: "TDEP",
      totalSupply: ethers.parseEther("1000000"),
      maxTxAmount: ethers.parseEther("1000000"),
      maxWalletAmount: ethers.parseEther("1000000"),
      enableTrading: false,
      tradingStartTime: BigInt(Math.floor(Date.now() / 1000) + 3600),
      marketingFeePercentage: BigInt(0),
      marketingWallet: deployer.address,
      developmentFeePercentage: BigInt(0), 
      developmentWallet: deployer.address,
      autoLiquidityFeePercentage: BigInt(0),
      enableBuyFees: false,
      enableSellFees: false
    };
    
    // Create the test token
    const tx = await factory.createToken(testParams, { value: listingFee });
    console.log("Test token creation transaction sent:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Test token creation confirmed, status:", receipt.status);
    
    // Look for the TokenCreated event
    const event = receipt.logs
      .filter(log => {
        try {
          return factory.interface.parseLog({ topics: log.topics, data: log.data }) !== null;
        } catch (e) {
          return false;
        }
      })
      .map(log => {
        try {
          return factory.interface.parseLog({ topics: log.topics, data: log.data });
        } catch (e) {
          return null;
        }
      })
      .find(event => event && event.name === "TokenCreated");
    
    if (event) {
      console.log("✅ Test token created at:", event.args.token);
      console.log("Factory deployment validated successfully!");
    } else {
      console.log("⚠️ Token created but no TokenCreated event found");
    }
  } catch (error) {
    console.error("❌ Failed to create test token:", error.message);
    console.log("The factory was deployed but could not create a test token.");
  }
  
  // Update the .env.local file with the new address
  console.log("\nAdd this line to your .env.local file:");
  console.log(`NEXT_PUBLIC_${networkName.toUpperCase()}_V2_DIRECTDEX_FIXED_ADDRESS=${factoryAddress}`);
  
  // Instructions for verification
  console.log("\nTo verify the contract on Etherscan/BscScan:");
  console.log(`npx hardhat verify --network ${networkName} ${factoryAddress} ${listingFee}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 