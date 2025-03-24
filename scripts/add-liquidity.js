// Script to add liquidity for a token using the liquidity module
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Adding liquidity using account:", deployer.address);
  
  // Test token address - replace with the token you want to add liquidity for
  // For example, we can use the ASIHOT token we created with the V6 factory
  const tokenAddress = "0x40807bEb49063561B361164492e35501a009028B"; // Replace with your token address
  
  // Get the token contract
  const tokenABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function getModules() view returns (address[])",
    "function owner() view returns (address)"
  ];
  
  const token = new ethers.Contract(tokenAddress, tokenABI, deployer);
  
  // Get token details
  const name = await token.name();
  const symbol = await token.symbol();
  const decimals = await token.decimals();
  const totalSupply = await token.totalSupply();
  const ownerBalance = await token.balanceOf(deployer.address);
  
  console.log(`Token: ${name} (${symbol})`);
  console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
  console.log(`Your Balance: ${ethers.formatUnits(ownerBalance, decimals)} ${symbol}`);
  
  // If we don't have enough tokens, we can't add liquidity
  if (ownerBalance.toString() === "0") {
    console.error("You don't have any tokens to add liquidity with!");
    return;
  }
  
  // Get modules
  console.log("\nFetching token modules...");
  const modules = await token.getModules();
  console.log(`Found ${modules.length} modules:`);
  
  // Find liquidity module
  console.log("Looking for liquidity module...");
  let liquidityModuleAddress = null;
  
  // Module detection utility
  const moduleTypeABI = ["function getModuleType() view returns (bytes32)"];
  
  for (let i = 0; i < modules.length; i++) {
    const moduleAddress = modules[i];
    try {
      const moduleContract = new ethers.Contract(moduleAddress, moduleTypeABI, deployer);
      const moduleType = await moduleContract.getModuleType();
      
      // Convert bytes32 to string for display
      const moduleTypeString = Buffer.from(ethers.hexlify(moduleType).slice(2), 'hex')
        .toString('utf8')
        .replace(/\0/g, '');
      
      console.log(`Module ${i+1}: ${moduleAddress} (${moduleTypeString})`);
      
      // Check if this is the liquidity module
      if (moduleTypeString === "LIQUIDITY_MODULE") {
        liquidityModuleAddress = moduleAddress;
        console.log(`Found liquidity module at ${liquidityModuleAddress}`);
      }
    } catch (error) {
      console.log(`Could not determine type of module at ${moduleAddress}: ${error.message}`);
    }
  }
  
  if (!liquidityModuleAddress) {
    console.error("Could not find liquidity module!");
    return;
  }
  
  // Now we can interact with the liquidity module
  const liquidityModuleABI = [
    "function addLiquidity(uint256 tokenAmount) payable returns (bool success)",
    "function getLPTokenBalance(address) view returns (uint256)",
    "function getReserves() view returns (uint256, uint256)",
    "function lockLiquidity(uint256 duration) returns (bool)"
  ];
  
  const liquidityModule = new ethers.Contract(liquidityModuleAddress, liquidityModuleABI, deployer);
  
  // Check existing liquidity
  try {
    const [tokenReserve, ethReserve] = await liquidityModule.getReserves();
    if (tokenReserve.toString() !== "0" || ethReserve.toString() !== "0") {
      console.log("\nExisting liquidity found:");
      console.log(`Token Reserve: ${ethers.formatUnits(tokenReserve, decimals)} ${symbol}`);
      console.log(`ETH Reserve: ${ethers.formatEther(ethReserve)} ETH`);
      
      const lpBalance = await liquidityModule.getLPTokenBalance(liquidityModuleAddress);
      console.log(`LP Tokens owned by module: ${lpBalance.toString()}`);
    } else {
      console.log("\nNo existing liquidity found.");
    }
  } catch (error) {
    console.log("Error checking reserves:", error.message);
    console.log("Proceeding with adding liquidity...");
  }
  
  // Determine amount of tokens to add to liquidity (10% of balance)
  const tokenAmount = ownerBalance.div(10); // 10% of balance
  const ethAmount = ethers.parseEther("0.01"); // 0.01 ETH for testing
  
  console.log(`\nAdding liquidity:`);
  console.log(`- ${ethers.formatUnits(tokenAmount, decimals)} ${symbol} tokens`);
  console.log(`- ${ethers.formatEther(ethAmount)} ETH`);
  
  // First we need to approve the token transfer
  const tokenTransferABI = ["function approve(address spender, uint256 amount) returns (bool)"];
  const tokenTransfer = new ethers.Contract(tokenAddress, tokenTransferABI, deployer);
  
  console.log("\nApproving token transfer...");
  const approveTx = await tokenTransfer.approve(liquidityModuleAddress, tokenAmount);
  console.log(`Approval transaction sent: ${approveTx.hash}`);
  await approveTx.wait();
  console.log("Approval transaction confirmed!");
  
  // Now add liquidity
  console.log("\nAdding liquidity...");
  try {
    const addLiquidityTx = await liquidityModule.addLiquidity(tokenAmount, {
      value: ethAmount
    });
    console.log(`Add liquidity transaction sent: ${addLiquidityTx.hash}`);
    
    const receipt = await addLiquidityTx.wait();
    console.log("Add liquidity transaction confirmed in block", receipt.blockNumber);
    
    // Check new liquidity
    const [newTokenReserve, newEthReserve] = await liquidityModule.getReserves();
    console.log(`\nNew liquidity pool reserve:`);
    console.log(`Token Reserve: ${ethers.formatUnits(newTokenReserve, decimals)} ${symbol}`);
    console.log(`ETH Reserve: ${ethers.formatEther(newEthReserve)} ETH`);
    
    // Lock liquidity for 1 day (86400 seconds)
    console.log("\nLocking liquidity for 1 day...");
    const lockTx = await liquidityModule.lockLiquidity(86400);
    console.log(`Lock transaction sent: ${lockTx.hash}`);
    await lockTx.wait();
    console.log("Liquidity locked successfully!");
    
    console.log("\nLiquidity addition completed successfully!");
  } catch (error) {
    console.error("Error adding liquidity:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 