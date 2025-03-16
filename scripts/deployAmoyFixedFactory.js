const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Polygon Amoy-specific fixed TokenFactory_v3...");
  
  // QuickSwap router for Polygon Amoy testnet
  const QUICKSWAP_ROUTER_AMOY = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
  
  // Get the contract factory
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  
  console.log("Using router address:", QUICKSWAP_ROUTER_AMOY);
  
  // Deploy the contract with router address and additional gas
  const deployOptions = {
    gasLimit: 5000000  // Increase gas limit for Polygon Amoy
  };
  
  const deployTx = await TokenFactory.deploy(QUICKSWAP_ROUTER_AMOY, deployOptions);
  
  // Wait for deployment to complete
  console.log("Waiting for deployment transaction to be mined...");
  await deployTx.waitForDeployment();
  const tokenFactoryAddress = await deployTx.getAddress();
  
  console.log("Polygon Amoy Fixed TokenFactory_v3 deployed to:", tokenFactoryAddress);
  console.log("This version has special fixes for Polygon Amoy/BSC wallet allocation issues:");
  console.log("1. Handles missing wallet allocations by defaulting to the owner");
  console.log("2. Forces direct distribution of non-vested tokens");
  console.log("3. Adds balance verification to ensure token transfer success");
  console.log("4. Normalizes vesting parameters across networks");
  
  // Save this address in your .env or .env.local file as:
  console.log("NEXT_PUBLIC_POLYGONTEST_FACTORY_ADDRESS_V3=" + tokenFactoryAddress);
  
  console.log("Wait for 30 seconds before verification...");
  // Wait for 30 seconds to make sure the contract is properly propagated
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Verify the contract
  try {
    await hre.run("verify:verify", {
      address: tokenFactoryAddress,
      constructorArguments: [QUICKSWAP_ROUTER_AMOY],
    });
    console.log("Contract verified successfully");
  } catch (error) {
    console.error("Error verifying contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 