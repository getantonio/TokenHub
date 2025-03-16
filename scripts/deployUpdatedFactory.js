const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying updated TokenFactory_v3...");
  
  // PancakeSwap router address for BSC Testnet
  const PANCAKESWAP_ROUTER_TESTNET = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  
  // Get the contract factory
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  
  // Deploy the contract with router address
  const deployTx = await TokenFactory.deploy(PANCAKESWAP_ROUTER_TESTNET);
  
  // Wait for deployment to complete
  console.log("Waiting for deployment transaction to be mined...");
  await deployTx.waitForDeployment();
  const tokenFactoryAddress = await deployTx.getAddress();
  
  console.log("TokenFactory_v3 deployed to:", tokenFactoryAddress);
  console.log("Use this address to interact with the factory contract");
  
  console.log("Wait for 30 seconds before verification...");
  // Wait for 30 seconds to make sure the contract is properly propagated
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Verify the contract
  try {
    await hre.run("verify:verify", {
      address: tokenFactoryAddress,
      constructorArguments: [PANCAKESWAP_ROUTER_TESTNET],
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