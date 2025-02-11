const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get current nonce
  const startNonce = await deployer.getNonce();
  console.log("Starting deployment with nonce:", startNonce);

  // Deploy TokenTemplate_v3
  console.log("Deploying TokenTemplate_v3...");
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v3");
  const tokenTemplate = await TokenTemplate.deploy({
    nonce: startNonce,
    gasPrice: ethers.parseUnits("10", "gwei") // BSC typically uses lower gas prices
  });

  await tokenTemplate.waitForDeployment();
  console.log("TokenTemplate_v3 deployed to:", await tokenTemplate.getAddress());

  // Deploy TokenFactory_v3
  console.log("Deploying TokenFactory_v3...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const tokenFactory = await TokenFactory.deploy({
    nonce: startNonce + 1,
    gasPrice: ethers.parseUnits("10", "gwei")
  });

  await tokenFactory.waitForDeployment();
  console.log("TokenFactory_v3 deployed to:", await tokenFactory.getAddress());

  // Initialize the factory
  console.log("Initializing TokenFactory_v3...");
  const initTx = await tokenFactory.initialize(await tokenTemplate.getAddress(), {
    nonce: startNonce + 2,
    gasPrice: ethers.parseUnits("10", "gwei")
  });
  await initTx.wait();
  console.log("TokenFactory_v3 initialized");

  // Set deployment fee to 0.001 BNB
  console.log("Setting deployment fee...");
  const setFeeTx = await tokenFactory.setDeploymentFee(ethers.parseEther("0.001"), {
    nonce: startNonce + 3,
    gasPrice: ethers.parseUnits("10", "gwei")
  });
  await setFeeTx.wait();
  console.log("Deployment fee set to 0.001 BNB");

  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("TokenTemplate_v3:", await tokenTemplate.getAddress());
  console.log("TokenFactory_v3:", await tokenFactory.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 