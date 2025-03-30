// Transfer Test Tokens script
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { formatUnits } = require("ethers");

async function main() {
  console.log("Transferring test tokens...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`From address: ${deployer.address}`);
  
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
  
  // Define recipient address
  const recipientAddress = "0xYOUR_RECIPIENT_ADDRESS_HERE"; // Replace with the actual recipient address
  
  // Check if recipient is valid
  if (recipientAddress === "0xYOUR_RECIPIENT_ADDRESS_HERE") {
    console.log("Please edit the script to provide a valid recipient address.");
    return;
  }
  
  // Transfer tokens
  const transferAmount = balance.div(10); // Transfer 10% of balance
  console.log(`Transferring ${formatUnits(transferAmount, tokenDecimals)} ${tokenSymbol} to ${recipientAddress}...`);
  
  const tx = await testTokenContract.transfer(recipientAddress, transferAmount);
  console.log(`Transaction hash: ${tx.hash}`);
  
  console.log("Waiting for transaction confirmation...");
  await tx.wait();
  
  // Check new balances
  const newBalance = await testTokenContract.balanceOf(deployer.address);
  const recipientBalance = await testTokenContract.balanceOf(recipientAddress);
  
  console.log(`\nTransfer complete!`);
  console.log(`Your new balance: ${formatUnits(newBalance, tokenDecimals)} ${tokenSymbol}`);
  console.log(`Recipient balance: ${formatUnits(recipientBalance, tokenDecimals)} ${tokenSymbol}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 