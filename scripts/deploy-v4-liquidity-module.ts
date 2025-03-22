const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying V4LiquidityModule with account:", deployer.address);

  // Deploy the V4LiquidityModule
  const V4LiquidityModule = await ethers.getContractFactory("V4LiquidityModule");
  const liquidityModule = await V4LiquidityModule.deploy();
  await liquidityModule.waitForDeployment();
  
  const liquidityModuleAddress = await liquidityModule.getAddress();
  console.log("V4LiquidityModule deployed to:", liquidityModuleAddress);

  // Wait for 60 seconds before verification to ensure the contract is properly propagated
  console.log("Waiting for 60 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 60000));

  // Verify contract on Etherscan/Explorer
  try {
    await hre.run("verify:verify", {
      address: liquidityModuleAddress,
      constructorArguments: [],
    });
    console.log("V4LiquidityModule verified successfully");
  } catch (error) {
    console.error("Error verifying V4LiquidityModule:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 