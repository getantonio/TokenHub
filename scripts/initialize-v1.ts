const { ethers } = require("hardhat");

async function main() {
  const factoryAddress = "0x4768734d10DCdfB8131eF6b942627557bDd754Eb";
  const defaultFee = ethers.parseEther("0.0001"); // 0.0001 ETH default fee

  console.log(`Initializing TokenFactory_v1.1.0 at ${factoryAddress}...`);
  console.log(`Setting deployment fee to: ${ethers.formatEther(defaultFee)} ETH`);

  const TokenFactory = await ethers.getContractFactory("TokenFactory_v1_1_0");
  const factory = TokenFactory.attach(factoryAddress);

  const tx = await factory.initialize(defaultFee);
  await tx.wait();

  console.log('Factory initialized successfully');
  
  // Verify the deployment fee was set
  const fee = await factory.deploymentFee();
  console.log(`Current deployment fee: ${ethers.formatEther(fee)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });