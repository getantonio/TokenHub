async function main() {
  const hre = require('hardhat');
  const { ethers } = hre;
  
  const factoryAddress = "0x4768734d10DCdfB8131eF6b942627557bDd754Eb";
  const factory = await ethers.getContractAt("TokenFactory_v1", factoryAddress);

  console.log("Initializing factory...");
  await factory.initialize();
  console.log("Factory initialized!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });