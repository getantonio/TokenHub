import { ethers } from "hardhat";
import { formatEther } from "ethers/lib/utils";
import { LoanPoolFactory, FeeCollector, TestToken } from "../typechain-types";

/**
 * Script to create a test lending pool with detailed logging and error handling
 */
async function main() {
  console.log("\n=== DEBUGGING POOL CREATION ===\n");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Using deployer: ${deployer.address}`);
  console.log(`Deployer balance: ${formatEther(await deployer.getBalance())} ETH`);
  
  // Get factory contract address from environment or hardcoded address
  const factoryAddress = process.env.FACTORY_ADDRESS || "0xB062C0d5a8Da595398c36f16BC7daA5054Ff9340";
  console.log(`Factory address: ${factoryAddress}`);
  
  // Connect to the factory contract
  console.log("Connecting to LoanPoolFactory...");
  let factoryContract: LoanPoolFactory;
  try {
    factoryContract = await ethers.getContractAt("LoanPoolFactory", factoryAddress);
    console.log("Successfully connected to LoanPoolFactory contract");
  } catch (error) {
    console.error("Error connecting to factory contract:", error);
    console.log("\nTrying to check if contract exists...");
    
    try {
      const code = await ethers.provider.getCode(factoryAddress);
      if (code === "0x") {
        console.error(`No contract found at address ${factoryAddress}`);
        return;
      } else {
        console.log(`Contract code exists at ${factoryAddress} (${code.length} bytes)`);
      }
    } catch (e) {
      console.error("Error checking contract code:", e);
      return;
    }
    return;
  }
  
  // Check factory contract state
  try {
    console.log("\n=== FACTORY CONTRACT STATE ===\n");
    
    // Get implementation
    const implementation = await factoryContract.implementation();
    console.log(`Implementation: ${implementation}`);
    
    // Get owner
    const owner = await factoryContract.owner();
    console.log(`Owner: ${owner}`);
    console.log(`Is deployer the owner? ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
    
    // Get fee collector
    const feeCollector = await factoryContract.feeCollector();
    console.log(`Fee collector: ${feeCollector}`);
    
    // Get pool count
    const poolCount = await factoryContract.poolCount();
    console.log(`Pool count: ${poolCount.toString()}`);
    
    // Get pools
    console.log("Fetching existing pools...");
    const pools = await factoryContract.getAllPools();
    console.log(`Found ${pools.length} pools:`);
    for (let i = 0; i < pools.length; i++) {
      console.log(`  Pool ${i + 1}: ${pools[i]}`);
    }
    
    // Get price oracle
    const priceOracle = await factoryContract.priceOracle();
    console.log(`Price oracle: ${priceOracle}`);
    
    // Get interest rate model
    const interestRateModel = await factoryContract.interestRateModel();
    console.log(`Interest rate model: ${interestRateModel}`);
    
  } catch (error) {
    console.error("Error checking factory state:", error);
    return;
  }
  
  // Deploy a test token if needed
  console.log("\n=== DEPLOYING TEST TOKEN ===\n");
  
  let testToken: TestToken;
  try {
    console.log("Deploying TestToken...");
    const TestTokenFactory = await ethers.getContractFactory("TestToken");
    testToken = await TestTokenFactory.deploy(
      "Test USD",
      "TUSD",
      18,
      ethers.utils.parseEther("1000000") // 1 million tokens
    );
    
    await testToken.deployed();
    console.log(`TestToken deployed at ${testToken.address}`);
    console.log(`Token name: ${await testToken.name()}`);
    console.log(`Token symbol: ${await testToken.symbol()}`);
    console.log(`Token decimals: ${await testToken.decimals()}`);
    console.log(`Token total supply: ${formatEther(await testToken.totalSupply())}`);
    
  } catch (error) {
    console.error("Error deploying test token:", error);
    return;
  }
  
  // Connect to FeeCollector to check fees
  console.log("\n=== CHECKING POOL CREATION FEE ===\n");
  
  let poolCreationFee;
  try {
    const feeCollectorAddress = await factoryContract.feeCollector();
    console.log(`Fee collector address: ${feeCollectorAddress}`);
    
    const feeCollectorContract = await ethers.getContractAt("FeeCollector", feeCollectorAddress);
    poolCreationFee = await feeCollectorContract.getPoolCreationFee();
    console.log(`Pool creation fee: ${formatEther(poolCreationFee)} ETH`);
    
  } catch (error) {
    console.error("Error getting pool creation fee:", error);
    // Use a default fee as fallback
    poolCreationFee = ethers.utils.parseEther("0.05");
    console.log(`Using default fee: ${formatEther(poolCreationFee)} ETH`);
  }
  
  // Create a lending pool
  console.log("\n=== CREATING LENDING POOL ===\n");
  
  // Set pool parameters
  const poolName = "Test USD Lending Pool";
  const poolSymbol = "TUSD-LP";
  const collateralFactorBps = 7500; // 75%
  const reserveFactorBps = 1000; // 10%
  
  console.log("Pool parameters:");
  console.log(`  Asset: ${testToken.address}`);
  console.log(`  Name: ${poolName}`);
  console.log(`  Symbol: ${poolSymbol}`);
  console.log(`  Collateral factor: ${collateralFactorBps / 100}%`);
  console.log(`  Reserve factor: ${reserveFactorBps / 100}%`);
  console.log(`  Creation fee: ${formatEther(poolCreationFee)} ETH`);
  
  try {
    console.log("\nCreating pool transaction...");
    
    // First approve token for max amount to the factory (allows factory to transfer tokens if needed)
    /*
    console.log("Approving token to factory...");
    await testToken.approve(factoryAddress, ethers.constants.MaxUint256);
    console.log("Token approved");
    */
    
    // Create the pool
    console.log("Submitting createLendingPool transaction...");
    const tx = await factoryContract.createLendingPool(
      testToken.address,
      poolName,
      poolSymbol,
      collateralFactorBps,
      reserveFactorBps,
      { value: poolCreationFee, gasLimit: 5000000 } // Use explicit gas limit
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");
    
    // Wait for transaction confirmation with detailed logs
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`Status: ${receipt.status === 1 ? "Success" : "Failed"}`);
    
    // Look for PoolCreated event
    console.log("\nSearching for PoolCreated event...");
    let poolAddress;
    for (const log of receipt.logs) {
      try {
        const logDescription = factoryContract.interface.parseLog(log);
        console.log(`Found log: ${logDescription.name}`);
        
        if (logDescription.name === "PoolCreated") {
          poolAddress = logDescription.args.pool;
          console.log(`Found PoolCreated event with pool address: ${poolAddress}`);
          break;
        }
      } catch (e) {
        // Not a log we can parse, skip
        continue;
      }
    }
    
    if (!poolAddress) {
      console.error("No PoolCreated event found in transaction logs!");
    } else {
      console.log("\n=== POOL CREATION SUCCESSFUL ===\n");
      console.log(`New pool created at: ${poolAddress}`);
      
      // Verify the pool was created by checking the factory
      const updatedPools = await factoryContract.getAllPools();
      console.log(`Updated pool count: ${updatedPools.length}`);
      
      // Check pool in assetToPools mapping
      const mappedPool = await factoryContract.assetToPools(testToken.address);
      console.log(`Asset to pool mapping: ${mappedPool}`);
      console.log(`Does it match created pool? ${mappedPool.toLowerCase() === poolAddress.toLowerCase()}`);
    }
    
  } catch (error) {
    console.error("\n=== POOL CREATION FAILED ===\n");
    console.error("Error creating lending pool:", error);
    
    // Detailed error analysis
    if (error.message) {
      console.error("\nError message:", error.message);
      
      if (error.message.includes("execution reverted")) {
        // Try to extract revert reason
        if (error.data) {
          try {
            const reason = error.data.substring(138);
            console.error("Revert reason:", ethers.utils.toUtf8String("0x" + reason));
          } catch (e) {
            console.error("Could not parse revert reason");
          }
        }
      }
    }
    
    // Check for common issues
    console.log("\nChecking for common issues:");
    
    try {
      // Check if pool already exists
      const existingPool = await factoryContract.assetToPools(testToken.address);
      if (existingPool !== ethers.constants.AddressZero) {
        console.error(`Pool for asset ${testToken.address} already exists at ${existingPool}`);
      }
      
      // Check deployer balance
      const balance = await deployer.getBalance();
      if (balance.lt(poolCreationFee)) {
        console.error("Insufficient balance for pool creation fee");
        console.error(`Required: ${formatEther(poolCreationFee)} ETH, Available: ${formatEther(balance)} ETH`);
      }
    } catch (e) {
      console.error("Error during troubleshooting:", e);
    }
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 