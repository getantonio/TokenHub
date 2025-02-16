const { ethers, run } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const creationFee = ethers.parseEther("0.001");
  const listingFee = ethers.parseEther("0.001");

  // Deploy TokenFactory_v2_Make
  const TokenFactory_v2_Make = await ethers.getContractFactory("TokenFactory_v2_Make");
  const makeFactory = await TokenFactory_v2_Make.deploy(creationFee);
  await makeFactory.waitForDeployment();
  console.log("TokenFactory_v2_Make deployed to:", await makeFactory.getAddress());

  // Deploy TokenFactory_v2_Bake
  const TokenFactory_v2_Bake = await ethers.getContractFactory("TokenFactory_v2_Bake");
  const bakeFactory = await TokenFactory_v2_Bake.deploy(listingFee);
  await bakeFactory.waitForDeployment();
  console.log("TokenFactory_v2_Bake deployed to:", await bakeFactory.getAddress());

  // Verify contracts if on a network that supports it
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying contracts...");
    try {
      await run("verify:verify", {
        address: await makeFactory.getAddress(),
        constructorArguments: [creationFee],
      });
      await run("verify:verify", {
        address: await bakeFactory.getAddress(),
        constructorArguments: [listingFee],
      });
      console.log("Contracts verified successfully");
    } catch (error) {
      console.error("Error verifying contracts:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 