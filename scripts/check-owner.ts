const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  console.log("Checking with account:", deployer.address);

  const factoryAddress = "0xc300648556860006771f1f982d3dDE65A54C1BA0";
  const factory = await ethers.getContractAt("TokenFactory_v2_DirectDEX_TwoStep", factoryAddress);

  const owner = await factory.owner();
  console.log("Contract owner:", owner);
  console.log("Current account:", deployer.address);
  console.log("Is owner:", owner.toLowerCase() === deployer.address.toLowerCase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 