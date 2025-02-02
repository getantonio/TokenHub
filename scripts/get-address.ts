import 'dotenv/config';

async function main() {
  const hre = require('hardhat');
  const { ethers } = hre;
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", await deployer.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });