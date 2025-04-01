const hre = require("hardhat");

async function main() {
  console.log("Starting implementation initialization...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get the implementation contract
  const implementationAddress = "0xb87C3D34EC9495Bfb741D7ac2b31BC5B3446758E";
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const implementation = LendingPool.attach(implementationAddress);
  
  console.log("\nChecking initialization status...");
  const isInitialized = await implementation.initialized();
  console.log("Is initialized:", isInitialized);
  
  if (isInitialized) {
    console.log("Implementation is already initialized");
    return;
  }
  
  // Get the factory contract to get the required addresses
  const factoryAddress = "0x36ef7eB49670b2F262f116Dc9a984667302BF586";
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = LoanPoolFactory.attach(factoryAddress);
  
  const priceOracle = await factory.priceOracle();
  const interestRateModel = await factory.interestRateModel();
  const feeCollector = await factory.feeCollector();
  
  console.log("\nUsing addresses from factory:");
  console.log("Price Oracle:", priceOracle);
  console.log("Interest Rate Model:", interestRateModel);
  console.log("Fee Collector:", feeCollector);
  
  // Initialize with real values
  console.log("\nInitializing implementation...");
  const tx = await implementation.initialize(
    "0x91b0e3cd883c3c78f5d263d6a67f5ec86efe4414", // PEPE token
    "Template Pool", // Dummy name
    "TEMP", // Dummy symbol
    7500, // 75% collateral factor
    1000, // 10% reserve factor
    priceOracle,
    interestRateModel,
    feeCollector
  );
  
  await tx.wait();
  console.log("Implementation initialized successfully");
  
  // Transfer ownership to factory
  console.log("\nTransferring ownership to factory...");
  const ownershipTx = await implementation.transferOwnership(factoryAddress);
  await ownershipTx.wait();
  console.log("Ownership transferred successfully");
  
  // Verify initialization and ownership
  const finalInitialized = await implementation.initialized();
  const finalOwner = await implementation.owner();
  console.log("\nFinal initialization status:", finalInitialized);
  console.log("Final owner:", finalOwner);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 