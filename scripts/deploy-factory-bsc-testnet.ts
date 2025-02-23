const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy factory
  const TokenFactory = await hre.ethers.getContractFactory("TokenFactory_v3");
  console.log("Deploying TokenFactory_v3...");
  const factory = await TokenFactory.deploy();
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("TokenFactory_v3 deployed to:", factoryAddress);

  // Set deployment fee (0.001 BNB)
  console.log("Setting deployment fee...");
  const setFeeTx = await factory.setDeploymentFee(hre.ethers.parseEther("0.001"));
  await setFeeTx.wait();
  console.log("Deployment fee set to 0.001 BNB");

  // Verify setup
  const fee = await factory.deploymentFee();
  console.log("\nVerification:");
  console.log("Deployment Fee:", hre.ethers.formatEther(fee), "BNB");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 