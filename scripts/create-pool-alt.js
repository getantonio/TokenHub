const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { formatEther } = require("ethers");

async function main() {
  console.log("Creating a lending pool with alternative approach...");
  
  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${formatEther(balance)} ETH`);
  
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
  
  // Load test token data
  let testTokenData;
  try {
    const tokenFilePath = path.join(__dirname, `../deployments/test-token-${hre.network.name}.json`);
    const tokenFileData = fs.readFileSync(tokenFilePath, 'utf8');
    testTokenData = JSON.parse(tokenFileData);
    console.log("Loaded test token data from file");
  } catch (error) {
    console.error("Error loading test token data:", error);
    return;
  }
  
  // Get deployed addresses
  const { factory, feeCollector } = deploymentData;
  const testToken = testTokenData.testToken;
  
  console.log(`Factory address: ${factory}`);
  console.log(`Fee Collector address: ${feeCollector}`);
  console.log(`Test token address: ${testToken}`);
  
  // Connect to contracts
  const factoryContract = await hre.ethers.getContractAt("LoanPoolFactory", factory);
  const feeCollectorContract = await hre.ethers.getContractAt("FeeCollector", feeCollector);
  
  // Prepare pool parameters
  const poolName = "Test USD Lending Pool";
  const poolSymbol = "tUSDLP";
  const collateralFactorBps = 7500; // 75%
  const reserveFactorBps = 1000; // 10%
  
  console.log(`Creating lending pool for token ${testToken}...`);
  console.log(`Name: ${poolName}`);
  console.log(`Symbol: ${poolSymbol}`);
  console.log(`Collateral factor: ${collateralFactorBps / 100}%`);
  console.log(`Reserve factor: ${reserveFactorBps / 100}%`);
  
  try {
    // STEP 1: First pay the fee to the fee collector directly
    const poolCreationFee = await feeCollectorContract.getPoolCreationFee();
    console.log(`Pool creation fee: ${formatEther(poolCreationFee)} ETH`);
    
    console.log("Sending fee to fee collector...");
    const feeTx = await feeCollectorContract.collectPoolCreationFee({ value: poolCreationFee });
    console.log(`Fee transaction hash: ${feeTx.hash}`);
    
    const feeReceipt = await feeTx.wait();
    console.log(`Fee transaction confirmed. Status: ${feeReceipt.status ? 'Success' : 'Failed'}`);
    
    // STEP 2: Now create the lending pool without sending value
    console.log("Now creating the lending pool...");
    const tx = await factoryContract.createLendingPool(
      testToken,
      poolName,
      poolSymbol,
      collateralFactorBps,
      reserveFactorBps,
      { value: 0 } // No value needed here since we already paid the fee
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    // Find the PoolCreated event
    let poolAddress;
    for (const log of receipt.logs) {
      try {
        const parsedLog = factoryContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (parsedLog && parsedLog.name === "PoolCreated") {
          poolAddress = parsedLog.args.pool;
          break;
        }
      } catch (e) {
        // Continue to next log if this one can't be parsed
        continue;
      }
    }
    
    if (!poolAddress) {
      throw new Error("Failed to find pool address in transaction logs");
    }
    
    console.log(`Lending pool created at address: ${poolAddress}`);
    
    // Update deployment data with pool address and test token
    deploymentData.lendingPool = poolAddress;
    deploymentData.testToken = testToken;
    
    // Save updated deployment data
    const filePath = path.join(__dirname, `../deployments/defi-${hre.network.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));
    console.log(`Deployment data updated and saved to ${filePath}`);
    
    console.log("\nSuccess! You can now interact with the lending pool.");
    console.log(`Test Token: ${testToken}`);
    console.log(`Lending Pool: ${poolAddress}`);
    
    console.log("\nUpdate your .env.local file with:");
    console.log(`NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS=${factory}`);
    console.log(`NEXT_PUBLIC_EXAMPLE_POOL_ADDRESS=${poolAddress}`);
    console.log(`NEXT_PUBLIC_EXAMPLE_TOKEN_ADDRESS=${testToken}`);
  } catch (error) {
    console.error("Error in the process:");
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 