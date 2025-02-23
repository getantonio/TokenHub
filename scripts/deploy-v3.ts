const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy TokenTemplate_v3
  console.log("\nDeploying TokenTemplate_v3...");
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v3");
  const tokenTemplate = await TokenTemplate.deploy();
  await tokenTemplate.waitForDeployment();
  console.log("TokenTemplate_v3 deployed to:", await tokenTemplate.getAddress());

  // Deploy TokenFactory_v3
  console.log("\nDeploying TokenFactory_v3...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const tokenFactory = await TokenFactory.deploy();
  await tokenFactory.waitForDeployment();
  console.log("TokenFactory_v3 deployed to:", await tokenFactory.getAddress());

  // Verify deployment
  console.log("\nVerifying deployment...");
  const factoryAddress = await tokenFactory.getAddress();
  const deploymentFee = await tokenFactory.deploymentFee();
  console.log("Factory deployment fee:", ethers.formatEther(deploymentFee), "BNB");

  // Verify contracts on BSCScan
  if (hre.network.name !== "hardhat") {
    console.log("\nVerifying contracts on BSCScan...");
    try {
      await hre.run("verify:verify", {
        address: await tokenTemplate.getAddress(),
        constructorArguments: []
      });
      console.log("TokenTemplate_v3 verified");
    } catch (error) {
      console.log("TokenTemplate_v3 verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: factoryAddress,
        constructorArguments: []
      });
      console.log("TokenFactory_v3 verified");
    } catch (error) {
      console.log("TokenFactory_v3 verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 