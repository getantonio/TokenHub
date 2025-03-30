// Check Test Token Balance script
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { formatUnits } = require("ethers");

async function main() {
  console.log("Checking test token balance...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Address: ${deployer.address}`);
  
  // Load deployment data
  let deploymentData;
  try {
    const filePath = path.join(__dirname, `../deployments/defi-${hre.network.name}.json`);
    const fileData = fs.readFileSync(filePath, 'utf8');
    deploymentData = JSON.parse(fileData);
    console.log("Loaded deployment data from file");
  } catch (error) {
    console.error("Error loading deployment data:", error);
    return;
  }
  
  // Get TestToken address
  const { testToken } = deploymentData;
  
  console.log(`TestToken address: ${testToken}`);
  
  // Connect to TestToken contract
  const testTokenContract = await hre.ethers.getContractAt("TestToken", testToken);
  
  // Get token info
  const tokenName = await testTokenContract.name();
  const tokenSymbol = await testTokenContract.symbol();
  const tokenDecimals = await testTokenContract.decimals();
  
  console.log(`Token: ${tokenName} (${tokenSymbol})`);
  
  // Check balance
  const balance = await testTokenContract.balanceOf(deployer.address);
  console.log(`Your balance: ${formatUnits(balance, tokenDecimals)} ${tokenSymbol}`);
  
  // Get token total supply
  const totalSupply = await testTokenContract.totalSupply();
  console.log(`Total supply: ${formatUnits(totalSupply, tokenDecimals)} ${tokenSymbol}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 