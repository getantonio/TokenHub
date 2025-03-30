const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { formatEther } = require("ethers");

async function main() {
  console.log("Creating an example lending pool...");
  
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
  console.log(`Test token address: ${testToken}`);
  
  // Connect to contracts
  const factoryContract = await hre.ethers.getContractAt("LoanPoolFactory", factory);
  const testTokenContract = await hre.ethers.getContractAt("TestToken", testToken);
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
  
  // Get pool creation fee
  const poolCreationFee = await feeCollectorContract.getPoolCreationFee();
  console.log(`Pool creation fee: ${formatEther(poolCreationFee)} ETH`);
  
  // Create the lending pool
  console.log("Submitting transaction to create lending pool...");
  try {
    // Check who owns the factory
    const factoryOwner = await factoryContract.owner();
    console.log(`Factory owner: ${factoryOwner}`);
    console.log(`Is deployer the factory owner? ${factoryOwner.toLowerCase() === deployer.address.toLowerCase()}`);
    
    // Get fee collector from factory
    const factoryFeeCollector = await factoryContract.feeCollector();
    console.log(`Factory fee collector: ${factoryFeeCollector}`);
    console.log(`Does it match our fee collector? ${factoryFeeCollector.toLowerCase() === feeCollector.toLowerCase()}`);
    
    const tx = await factoryContract.createLendingPool(
      testToken,
      poolName,
      poolSymbol,
      collateralFactorBps,
      reserveFactorBps,
      { value: poolCreationFee }
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
    console.error("Error creating lending pool:");
    console.error(error);
    
    // Try to decode the error if it's a revert
    if (error.message.includes("reverted") && error.data) {
      try {
        const decodedError = factoryContract.interface.parseError(error.data);
        console.log(`Decoded error: ${decodedError.name}`);
        console.log(`Error args: ${decodedError.args}`);
      } catch (decodeError) {
        console.log("Could not decode error data");
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 