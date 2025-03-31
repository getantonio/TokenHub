require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });
const hre = require("hardhat");

async function main() {
  console.log("Deploying FeeCollector contract...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Deploy FeeCollector
  const FeeCollector = await hre.ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy();
  await feeCollector.waitForDeployment();
  const feeCollectorAddress = await feeCollector.getAddress();
  console.log(`FeeCollector deployed to: ${feeCollectorAddress}`);
  
  // Set pool creation fee to 0.05 ETH
  const poolCreationFee = hre.ethers.parseEther("0.05");
  const setFeeTx = await feeCollector.setPoolCreationFee(poolCreationFee);
  await setFeeTx.wait();
  console.log(`Pool creation fee set to 0.05 ETH`);
  
  // Get factory address
  const factoryAddress = process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS;
  if (!factoryAddress) {
    throw new Error("Factory address not found in environment variables");
  }
  
  // Authorize factory to collect fees
  const authTx = await feeCollector.authorizeCaller(factoryAddress);
  await authTx.wait();
  console.log(`Factory ${factoryAddress} authorized to collect fees`);
  
  // Verify authorization
  const isAuthorized = await feeCollector.authorizedCallers(factoryAddress);
  console.log(`Is factory authorized? ${isAuthorized}`);
  
  console.log("\nDeployment Summary:");
  console.log(`FeeCollector: ${feeCollectorAddress}`);
  console.log(`Factory: ${factoryAddress}`);
  console.log(`Pool Creation Fee: 0.05 ETH`);
  console.log(`\nAdd this to your .env.local file:`);
  console.log(`NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS=${feeCollectorAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 