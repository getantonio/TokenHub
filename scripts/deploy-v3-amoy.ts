const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get current nonce
  const startNonce = await deployer.getNonce();
  console.log("Starting deployment with nonce:", startNonce);

  // QuickSwap router address for Polygon Amoy
  const QUICKSWAP_ROUTER = "0x7E0987E5b3a30e3f2828572Bb659A548460a3003";
  console.log("Using QuickSwap router:", QUICKSWAP_ROUTER);

  // Deploy TokenTemplate_v3
  console.log("Deploying TokenTemplate_v3...");
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v3");
  const tokenTemplate = await TokenTemplate.deploy(QUICKSWAP_ROUTER);

  await tokenTemplate.waitForDeployment();
  const templateAddress = await tokenTemplate.getAddress();
  console.log("TokenTemplate_v3 deployed to:", templateAddress);

  // Deploy TokenFactory_v3
  console.log("Deploying TokenFactory_v3...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const tokenFactory = await TokenFactory.deploy(QUICKSWAP_ROUTER);

  await tokenFactory.waitForDeployment();
  const factoryAddress = await tokenFactory.getAddress();
  console.log("TokenFactory_v3 deployed to:", factoryAddress);

  // Set deployment fee to 0.0001 ETH
  console.log("Setting deployment fee...");
  const setFeeTx = await tokenFactory.setDeploymentFee(ethers.parseEther("0.0001"));
  await setFeeTx.wait();
  console.log("Deployment fee set to 0.0001 ETH");

  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("TokenTemplate_v3:", templateAddress);
  console.log("TokenFactory_v3:", factoryAddress);

  // Verify contracts
  console.log("\nVerifying contracts...");
  try {
    await hre.run("verify:verify", {
      address: templateAddress,
      constructorArguments: [QUICKSWAP_ROUTER],
    });
    console.log("TokenTemplate_v3 verified");
  } catch (error) {
    console.log("TokenTemplate_v3 verification failed:", error.message);
  }

  try {
    await hre.run("verify:verify", {
      address: factoryAddress,
      constructorArguments: [QUICKSWAP_ROUTER],
    });
    console.log("TokenFactory_v3 verified");
  } catch (error) {
    console.log("TokenFactory_v3 verification failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 