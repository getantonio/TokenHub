const hardhat = require("hardhat");

async function main() {
  const [deployer] = await hardhat.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy TokenTemplate_v3_clone
  console.log("Deploying TokenTemplate_v3_clone...");
  const TokenTemplate = await hardhat.ethers.getContractFactory("TokenTemplate_v3_clone");
  const tokenTemplate = await TokenTemplate.deploy();
  await tokenTemplate.waitForDeployment();
  console.log("TokenTemplate_v3_clone deployed to:", await tokenTemplate.getAddress());

  // Deploy TokenFactory_v3_clone
  console.log("\nDeploying TokenFactory_v3_clone...");
  const TokenFactory = await hardhat.ethers.getContractFactory("TokenFactory_v3_clone");
  const tokenFactory = await TokenFactory.deploy();
  await tokenFactory.waitForDeployment();
  
  // Initialize the factory
  const initTx = await tokenFactory.initialize(await tokenTemplate.getAddress());
  await initTx.wait();
  
  console.log("TokenFactory_v3_clone deployed to:", await tokenFactory.getAddress());

  // Log all deployment addresses
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("TokenTemplate_v3_clone:", await tokenTemplate.getAddress());
  console.log("TokenFactory_v3_clone:", await tokenFactory.getAddress());

  // Verify contracts on Etherscan
  console.log("\nVerifying contracts on Etherscan...");
  try {
    await hardhat.run("verify:verify", {
      address: await tokenTemplate.getAddress(),
      constructorArguments: []
    });
    console.log("TokenTemplate_v3_clone verified");

    await hardhat.run("verify:verify", {
      address: await tokenFactory.getAddress(),
      constructorArguments: []
    });
    console.log("TokenFactory_v3_clone verified");
  } catch (error) {
    console.log("Error verifying contracts:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 