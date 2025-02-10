const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Initializing factory with account:", deployer.address);

  // Get the current nonce
  const currentNonce = await deployer.getNonce();
  console.log("Current nonce:", currentNonce);

  // Get the factory contract
  const factoryAddress = "0x631B224FeA79e2af00D8A891e9e21E7a9f63CfC7";
  const templateAddress = "0x2c126326a09F90a2Bf4d2f5C3b6caF84B2FDED23";
  
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  const factory = TokenFactory.attach(factoryAddress);

  console.log("Initializing factory...");
  const tx = await factory.initialize(templateAddress, {
    nonce: currentNonce,
    gasPrice: ethers.parseUnits("35", "gwei")
  });
  await tx.wait();
  console.log("Factory initialized successfully");

  // Set deployment fee
  console.log("Setting deployment fee...");
  const setFeeTx = await factory.setDeploymentFee(ethers.parseEther("0.0001"), {
    nonce: currentNonce + 1,
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