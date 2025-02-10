const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting fee with account:", deployer.address);

  // Get the current nonce
  const currentNonce = await deployer.getNonce();
  console.log("Current nonce:", currentNonce);

  // Get the factory contract
  const factoryAddress = "0x631B224FeA79e2af00D8A891e9e21E7a9f63CfC7";
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const factory = TokenFactory.attach(factoryAddress);

  // Set deployment fee
  console.log("Setting deployment fee...");
  const setFeeTx = await factory.setDeploymentFee(ethers.parseEther("0.0001"), {
    nonce: currentNonce,
    gasPrice: ethers.parseUnits("35", "gwei")
  });
  await setFeeTx.wait();
  console.log("Deployment fee set to 0.0001 ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 