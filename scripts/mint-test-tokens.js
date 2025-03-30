// Mint Test Tokens script
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { parseUnits, formatUnits } = require("ethers");

async function main() {
  console.log("Minting test tokens...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Owner address: ${deployer.address}`);
  
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
  
  // Check current balance and total supply
  const initialBalance = await testTokenContract.balanceOf(deployer.address);
  const initialSupply = await testTokenContract.totalSupply();
  
  console.log(`Initial balance: ${formatUnits(initialBalance, tokenDecimals)} ${tokenSymbol}`);
  console.log(`Initial total supply: ${formatUnits(initialSupply, tokenDecimals)} ${tokenSymbol}`);
  
  // Mint tokens
  const mintAmount = parseUnits("1000000", tokenDecimals); // 1 million tokens
  console.log(`\nMinting ${formatUnits(mintAmount, tokenDecimals)} ${tokenSymbol} tokens to ${deployer.address}...`);
  
  // Mint tokens to deployer
  const tx = await testTokenContract.mint(deployer.address, mintAmount);
  console.log(`Transaction hash: ${tx.hash}`);
  
  console.log("Waiting for transaction confirmation...");
  await tx.wait();
  
  // Check new balance and total supply
  const newBalance = await testTokenContract.balanceOf(deployer.address);
  const newSupply = await testTokenContract.totalSupply();
  
  console.log(`\nMinting complete!`);
  console.log(`New balance: ${formatUnits(newBalance, tokenDecimals)} ${tokenSymbol}`);
  console.log(`New total supply: ${formatUnits(newSupply, tokenDecimals)} ${tokenSymbol}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 