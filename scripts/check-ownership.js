// Check contract ownership
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Checking ownership of all contracts...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Factory contract
  const factoryAddress = "0x88e7f1e0603BF8977648075cFEF9A63Ac004177C";
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = LoanPoolFactory.attach(factoryAddress);
  const factoryOwner = await factory.owner();
  console.log("\nFactory contract:");
  console.log("Address:", factoryAddress);
  console.log("Owner:", factoryOwner);
  console.log("Is owner deployer:", factoryOwner.toLowerCase() === deployer.address.toLowerCase());

  // Implementation contract
  const implementationAddress = "0x2a8E90b9B02606cE92907f0E9d2efE37ffa225A3";
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const implementation = LendingPool.attach(implementationAddress);
  const implementationOwner = await implementation.owner();
  console.log("\nImplementation contract:");
  console.log("Address:", implementationAddress);
  console.log("Owner:", implementationOwner);
  console.log("Is owner deployer:", implementationOwner.toLowerCase() === deployer.address.toLowerCase());

  // Price Oracle contract
  const priceOracleAddress = "0xd13845B5Af0F90E33A3E68582297433bD68B1C8D";
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = PriceOracle.attach(priceOracleAddress);
  const priceOracleOwner = await priceOracle.owner();
  console.log("\nPrice Oracle contract:");
  console.log("Address:", priceOracleAddress);
  console.log("Owner:", priceOracleOwner);
  console.log("Is owner deployer:", priceOracleOwner.toLowerCase() === deployer.address.toLowerCase());

  // Interest Rate Model contract
  const interestRateModelAddress = "0x993875Dc709235521c51Ac37ccC2E8D6952b6eB1";
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const interestRateModel = InterestRateModel.attach(interestRateModelAddress);
  const interestRateModelOwner = await interestRateModel.owner();
  console.log("\nInterest Rate Model contract:");
  console.log("Address:", interestRateModelAddress);
  console.log("Owner:", interestRateModelOwner);
  console.log("Is owner deployer:", interestRateModelOwner.toLowerCase() === deployer.address.toLowerCase());

  // Fee Collector contract
  const feeCollectorAddress = "0x43dA1465F87921BbAD927CC1C7ac8AF81D1e4f5C";
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = FeeCollector.attach(feeCollectorAddress);
  const feeCollectorOwner = await feeCollector.owner();
  console.log("\nFee Collector contract:");
  console.log("Address:", feeCollectorAddress);
  console.log("Owner:", feeCollectorOwner);
  console.log("Is owner deployer:", feeCollectorOwner.toLowerCase() === deployer.address.toLowerCase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 