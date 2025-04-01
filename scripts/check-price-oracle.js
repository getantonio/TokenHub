const hre = require("hardhat");

async function main() {
  console.log("Starting price oracle check...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get the factory contract
  const factoryAddress = "0xe51351825EDD12bfE6975C37Db3c5447f8cf11DC";
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = LoanPoolFactory.attach(factoryAddress);
  
  // Get the price oracle address
  const priceOracleAddress = await factory.priceOracle();
  console.log("\nPrice oracle address:", priceOracleAddress);
  
  // Get the price oracle contract
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = PriceOracle.attach(priceOracleAddress);
  
  // Check owner
  const owner = await priceOracle.owner();
  console.log("\nPrice oracle owner:", owner);
  console.log("Is owner deployer:", owner.toLowerCase() === deployer.address.toLowerCase());
  
  // Check PEPE price
  const assetAddress = "0x91b0e3cd883c3c78f5d263d6a67f5ec86efe4414"; // PEPE token
  const price = await priceOracle.getAssetPrice(assetAddress);
  console.log("\nPEPE price:", price.toString());
  
  // Set PEPE price if not set
  if (price.toString() === "0") {
    console.log("\nSetting PEPE price...");
    const tx = await priceOracle.setAssetPrice(assetAddress, ethers.parseUnits("0.000001", 18)); // $0.000001 per PEPE
    await tx.wait();
    console.log("PEPE price set successfully");
    
    // Verify price
    const newPrice = await priceOracle.getAssetPrice(assetAddress);
    console.log("New PEPE price:", ethers.formatUnits(newPrice, 18));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 