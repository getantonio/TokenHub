const { ethers } = require('hardhat');

async function main() {
  console.log("Debugging pool creation...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Load deployment data
  const deploymentData = require('../deployments/defi-sepolia.json');
  const factoryAddress = deploymentData.factory;
  const implementationAddress = deploymentData.lendingPoolImplementation;
  
  console.log(`Factory address: ${factoryAddress}`);
  console.log(`Implementation address: ${implementationAddress}`);
  
  // Create factory contract instance with full ABI
  const factoryABI = require('../artifacts/contracts/defi/LoanPoolFactory.sol/LoanPoolFactory.json').abi;
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Create implementation contract instance with full ABI
  const implementationABI = require('../artifacts/contracts/defi/LendingPool.sol/LendingPool.json').abi;
  const implementation = new ethers.Contract(implementationAddress, implementationABI, deployer);
  
  // Test parameters
  const testParams = {
    asset: "0xdef1aa0fb7b7c09a5fc3e28625d7a1a2b0012d6a", // DEFLIQ token
    name: "DEFLIQ Lending Pool",
    symbol: "dDEFLIQ",
    collateralFactorBps: 7500, // 75%
    reserveFactorBps: 1000     // 10%
  };
  
  console.log("\nDebugging with parameters:");
  console.log(`Asset: ${testParams.asset}`);
  console.log(`Name: ${testParams.name}`);
  console.log(`Symbol: ${testParams.symbol}`);
  console.log(`Collateral Factor: ${testParams.collateralFactorBps} bps`);
  console.log(`Reserve Factor: ${testParams.reserveFactorBps} bps`);
  
  // Verify contract ownership
  const factoryOwner = await factory.owner();
  console.log(`\nFactory owner: ${factoryOwner}`);
  console.log(`Is deployer the factory owner? ${factoryOwner.toLowerCase() === deployer.address.toLowerCase()}`);
  
  const implementationOwner = await implementation.owner();
  console.log(`Implementation owner: ${implementationOwner}`);
  console.log(`Is deployer the implementation owner? ${implementationOwner.toLowerCase() === deployer.address.toLowerCase()}`);
  
  // Check factory configuration
  const feeCollectorAddress = await factory.feeCollector();
  const priceOracleAddress = await factory.priceOracle();
  const interestRateModelAddress = await factory.interestRateModel();
  
  console.log(`\nFactory configuration:`);
  console.log(`FeeCollector: ${feeCollectorAddress}`);
  console.log(`PriceOracle: ${priceOracleAddress}`);
  console.log(`InterestRateModel: ${interestRateModelAddress}`);
  
  // Check fee collector authorization
  const feeCollectorABI = ["function authorizedCallers(address) external view returns (bool)"];
  const feeCollector = new ethers.Contract(feeCollectorAddress, feeCollectorABI, deployer);
  const isAuthorized = await feeCollector.authorizedCallers(factoryAddress);
  console.log(`Is factory authorized in FeeCollector? ${isAuthorized}`);
  
  // Check if implementation is already initialized
  try {
    const initialized = await implementation.initialized();
    console.log(`Is implementation already initialized? ${initialized}`);
  } catch (e) {
    console.log(`Error checking if implementation is initialized: ${e.message}`);
  }
  
  // Deploy a clone manually for testing
  console.log("\nDeploying a clone of the implementation manually...");
  const ClonesABI = [
    "function clone(address implementation) external returns (address instance)"
  ];
  
  // We need to deploy a temporary cloner contract
  const ClonerFactory = await ethers.getContractFactory("Cloner");
  const cloner = await ClonerFactory.deploy();
  await cloner.waitForDeployment();
  console.log(`Cloner deployed at: ${await cloner.getAddress()}`);
  
  // Clone the implementation
  const cloneTx = await cloner.clone(implementationAddress);
  const receipt = await cloneTx.wait();
  
  // Find the clone address from events
  const cloneInterface = new ethers.Interface(["event Cloned(address indexed original, address indexed cloned)"]);
  let cloneAddress;
  
  for (const log of receipt.logs) {
    try {
      const parsedLog = cloneInterface.parseLog({
        topics: log.topics,
        data: log.data
      });
      
      if (parsedLog && parsedLog.name === "Cloned") {
        cloneAddress = parsedLog.args.cloned;
        break;
      }
    } catch (e) {
      // Skip logs that can't be parsed
    }
  }
  
  console.log(`Clone deployed at: ${cloneAddress}`);
  
  // Create clone contract instance
  const cloneContract = new ethers.Contract(cloneAddress, implementationABI, deployer);
  
  // Try to initialize the clone directly
  try {
    console.log("\nInitializing the clone directly...");
    const tx = await cloneContract.initialize(
      testParams.asset,
      testParams.name,
      testParams.symbol,
      testParams.collateralFactorBps,
      testParams.reserveFactorBps,
      priceOracleAddress,
      interestRateModelAddress,
      feeCollectorAddress
    );
    
    await tx.wait();
    console.log("Clone initialization successful!");
    
    // Verify the clone's owner
    const cloneOwner = await cloneContract.owner();
    console.log(`Clone owner: ${cloneOwner}`);
    console.log(`Is deployer the clone owner? ${cloneOwner.toLowerCase() === deployer.address.toLowerCase()}`);
  } catch (error) {
    console.error("Error initializing clone:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 