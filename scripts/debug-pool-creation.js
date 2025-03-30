const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { formatEther, parseEther } = require("ethers");

async function main() {
  console.log("DEBUG: Pool Creation Process");
  console.log("============================");
  
  try {
    // Get signer
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Using account: ${deployer.address}`);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`Account balance: ${formatEther(balance)} ETH`);
    
    // Load deployment data
    let deploymentData;
    try {
      const filePath = path.join(__dirname, `../deployments/full-deployment-${hre.network.name}.json`);
      const fileData = fs.readFileSync(filePath, 'utf8');
      deploymentData = JSON.parse(fileData);
      console.log("Loaded deployment data from file");
    } catch (error) {
      console.error("Error loading deployment data:", error);
      return;
    }
    
    const { 
      factory: factoryAddress, 
      feeCollector: feeCollectorAddress,
      testToken: testTokenAddress 
    } = deploymentData;
    
    console.log(`Factory address: ${factoryAddress}`);
    console.log(`FeeCollector address: ${feeCollectorAddress}`);
    console.log(`TestToken address: ${testTokenAddress}`);
    
    // Connect to contracts
    console.log("\nStep 1: Connecting to contracts...");
    const factoryContract = await hre.ethers.getContractAt("LoanPoolFactory", factoryAddress);
    const feeCollectorContract = await hre.ethers.getContractAt("FeeCollector", feeCollectorAddress);
    const testTokenContract = await hre.ethers.getContractAt("TestToken", testTokenAddress);
    
    // Check ownership
    console.log("\nStep 2: Checking ownership and authorization...");
    const factoryOwner = await factoryContract.owner();
    console.log(`Factory owner: ${factoryOwner}`);
    console.log(`Is deployer the factory owner? ${factoryOwner.toLowerCase() === deployer.address.toLowerCase()}`);
    
    const feeCollectorOwner = await feeCollectorContract.owner();
    console.log(`FeeCollector owner: ${feeCollectorOwner}`);
    console.log(`Is deployer the fee collector owner? ${feeCollectorOwner.toLowerCase() === deployer.address.toLowerCase()}`);
    
    const isFactoryAuthorized = await feeCollectorContract.authorizedCallers(factoryAddress);
    console.log(`Is factory authorized to collect fees? ${isFactoryAuthorized}`);
    
    if (!isFactoryAuthorized) {
      console.log("\nAuthorizing factory as a caller...");
      const authTx = await feeCollectorContract.authorizeCaller(factoryAddress);
      await authTx.wait();
      
      const isNowAuthorized = await feeCollectorContract.authorizedCallers(factoryAddress);
      console.log(`Is factory now authorized? ${isNowAuthorized}`);
    }
    
    // Check fee
    console.log("\nStep 3: Checking pool creation fee...");
    const poolCreationFee = await feeCollectorContract.getPoolCreationFee();
    console.log(`Pool creation fee: ${formatEther(poolCreationFee)} ETH`);
    
    if (poolCreationFee > 0) {
      console.log("Setting pool creation fee to 0 for testing...");
      const setFeeTx = await feeCollectorContract.setPoolCreationFee(0);
      await setFeeTx.wait();
      
      const newFee = await feeCollectorContract.getPoolCreationFee();
      console.log(`New pool creation fee: ${formatEther(newFee)} ETH`);
    }
    
    // Check token details
    console.log("\nStep 4: Checking token details...");
    const tokenName = await testTokenContract.name();
    const tokenSymbol = await testTokenContract.symbol();
    const tokenDecimals = await testTokenContract.decimals();
    console.log(`Token: ${tokenName} (${tokenSymbol}), Decimals: ${tokenDecimals}`);
    
    const tokenBalance = await testTokenContract.balanceOf(deployer.address);
    console.log(`Deployer token balance: ${formatEther(tokenBalance)} ${tokenSymbol}`);
    
    // Prepare pool parameters
    console.log("\nStep 5: Preparing pool parameters...");
    const poolName = "Test USD Lending Pool";
    const poolSymbol = "tUSDLP";
    const collateralFactorBps = 7500; // 75%
    const reserveFactorBps = 1000; // 10%
    
    console.log(`Pool Name: ${poolName}`);
    console.log(`Pool Symbol: ${poolSymbol}`);
    console.log(`Collateral Factor: ${collateralFactorBps / 100}%`);
    console.log(`Reserve Factor: ${reserveFactorBps / 100}%`);
    
    // Create the pool with detailed logging
    console.log("\nStep 6: Creating the lending pool...");
    
    try {
      // Create transaction
      console.log("Submitting transaction to create lending pool...");
      const tx = await factoryContract.createLendingPool(
        testTokenAddress,
        poolName,
        poolSymbol,
        collateralFactorBps,
        reserveFactorBps,
        { value: 0 }
      );
      
      console.log(`Transaction hash: ${tx.hash}`);
      console.log("Waiting for transaction confirmation...");
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Find the pool address from events
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
          // Ignore parsing errors
          continue;
        }
      }
      
      if (poolAddress) {
        console.log(`Success! Lending pool created at address: ${poolAddress}`);
      } else {
        console.log("Warning: Transaction succeeded but pool address not found in logs");
      }
      
    } catch (error) {
      console.error("Error creating lending pool:");
      console.error(error.message);
      
      if (error.data) {
        try {
          const decodedError = factoryContract.interface.parseError(error.data);
          console.log(`Decoded error: ${decodedError.name}`);
          console.log(`Error args: ${decodedError.args}`);
        } catch (decodeError) {
          console.log("Could not decode error data.");
        }
      }
      
      // Try to get more information about what's happening
      console.log("\nAdditional debug information:");
      
      try {
        // Check if the asset already has a pool
        const existingPool = await factoryContract.assetToPools(testTokenAddress);
        if (existingPool !== "0x0000000000000000000000000000000000000000") {
          console.log(`A pool already exists for this token at: ${existingPool}`);
        } else {
          console.log("No existing pool found for this token.");
        }
      } catch (debugError) {
        console.log("Error checking existing pool:", debugError.message);
      }
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 