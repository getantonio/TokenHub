const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const TokenTemplate = await hre.ethers.getContractFactory("TokenTemplate_v3");
  console.log("Deploying TokenTemplate_v3...");
  const template = await TokenTemplate.deploy();
  await template.waitForDeployment();
  
  const templateAddress = await template.getAddress();
  console.log("TokenTemplate_v3 deployed to:", templateAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 