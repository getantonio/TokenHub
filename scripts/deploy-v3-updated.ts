const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying updated contracts with the account:", deployer.address);

  // Get current nonce
  const startNonce = await deployer.getNonce();
  console.log("Starting deployment with nonce:", startNonce);

  // Get the router address based on the network
  let routerAddress;
  if (hre.network.name === "polygon_amoy") {
    // QuickSwap router address for Polygon Amoy
    routerAddress = "0x7E0987E5b3a30e3f2828572Bb659A548460a3003";
  } else if (hre.network.name === "bsc" || hre.network.name === "bscTestnet") {
    // PancakeSwap router address for BSC
    routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
  } else {
    // Default to Uniswap router for other networks
    routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  }
  console.log("Using router address:", routerAddress);

  // Deploy TokenFactory_v3_Updated
  console.log("Deploying TokenFactory_v3_Updated...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_Updated");
  const tokenFactory = await TokenFactory.deploy(routerAddress);
  await tokenFactory.waitForDeployment();
  const factoryAddress = await tokenFactory.getAddress();
  console.log("TokenFactory_v3_Updated deployed to:", factoryAddress);

  // Set deployment fee based on network
  let deploymentFee;
  if (hre.network.name === "polygon_amoy") {
    deploymentFee = ethers.parseEther("0.0001");
  } else if (hre.network.name === "bsc" || hre.network.name === "bscTestnet") {
    deploymentFee = ethers.parseEther("0.001");
  } else {
    deploymentFee = ethers.parseEther("0.001");
  }
  
  console.log(`Setting deployment fee to ${ethers.formatEther(deploymentFee)}...`);
  const setFeeTx = await tokenFactory.setDeploymentFee(deploymentFee);
  await setFeeTx.wait();
  console.log(`Deployment fee set to ${ethers.formatEther(deploymentFee)}`);

  // Unpause the factory
  console.log("Unpausing the factory...");
  const unpauseTx = await tokenFactory.unpause();
  await unpauseTx.wait();
  console.log("Factory unpaused");

  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("TokenFactory_v3_Updated:", factoryAddress);
  console.log("Router Address:", routerAddress);
  console.log("Deployment Fee:", ethers.formatEther(deploymentFee));

  // Verify contracts
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nVerifying contracts...");
    try {
      await hre.run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [routerAddress],
      });
      console.log("TokenFactory_v3_Updated verified");
    } catch (error) {
      console.log("TokenFactory_v3_Updated verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 