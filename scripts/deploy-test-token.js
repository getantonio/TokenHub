// Deploy Test Token script
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { parseUnits, formatUnits } = require("ethers");

async function main() {
  console.log("Deploying test token...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying from: ${deployer.address}`);
  
  // Deploy TestToken
  console.log("Deploying TestToken...");
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy("Test USD", "TUSD", 18);
  console.log(`Waiting for deployment...`);
  
  // Wait for deployment to complete
  const deployedToken = await testToken.waitForDeployment();
  const tokenAddress = await deployedToken.getAddress();
  console.log(`TestToken deployed to: ${tokenAddress}`);
  
  // Mint tokens
  console.log(`Minting tokens to deployer...`);
  const mintAmount = parseUnits("1000000", 18); // 1 million tokens
  const tx = await testToken.mint(deployer.address, mintAmount);
  console.log(`Minting transaction: ${tx.hash}`);
  console.log(`Waiting for transaction confirmation...`);
  await tx.wait();
  
  // Get balance
  const balance = await testToken.balanceOf(deployer.address);
  console.log(`Balance: ${formatUnits(balance, 18)} TUSD`);
  
  // Save token address to file
  const data = {
    network: hre.network.name,
    testToken: tokenAddress
  };
  
  const filePath = path.join(__dirname, `../deployments/test-token-${hre.network.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Token address saved to ${filePath}`);
  
  console.log("\nToken deployment complete!");
  console.log(`Token Address: ${tokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 