const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get the current nonce
  const currentNonce = await deployer.getNonce();
  console.log("Current nonce:", currentNonce);
  console.log("Using nonce:", 70); // Using nonce after pending transactions

  // Deploy TokenTemplate_v3
  console.log("Deploying TokenTemplate_v3...");
  const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v3");
  const tokenTemplate = await TokenTemplate.deploy({
    nonce: 70, // Explicitly set nonce to skip pending transactions
  });

  await tokenTemplate.waitForDeployment();
  console.log("TokenTemplate_v3 deployed to:", await tokenTemplate.getAddress());

  // Deploy TokenFactory_v3
  console.log("Deploying TokenFactory_v3...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const tokenFactory = await TokenFactory.deploy(
    await tokenTemplate.getAddress(),
    {
      nonce: 71, // Increment nonce for second deployment
    }
  );

  await tokenFactory.waitForDeployment();
  console.log("TokenFactory_v3 deployed to:", await tokenFactory.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 