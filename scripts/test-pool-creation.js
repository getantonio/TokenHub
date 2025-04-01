const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting pool creation test with contract interface...");

  // Get the signer
  const [signer] = await ethers.getSigners();
  console.log("\nSigner details:");
  console.log("Address:", signer.address);
  console.log("Provider:", signer.provider ? "Connected" : "Not connected");

  // Get network details
  const network = await ethers.provider.getNetwork();
  console.log("\nNetwork details:");
  console.log("Chain ID:", network.chainId);
  console.log("Name:", network.name);

  // Get transaction details
  const nonce = await ethers.provider.getTransactionCount(signer.address);
  const feeData = await ethers.provider.getFeeData();
  console.log("\nTransaction details:");
  console.log("Nonce:", nonce);
  console.log("Gas price:", feeData.gasPrice);
  console.log("Max fee per gas:", feeData.maxFeePerGas);
  console.log("Max priority fee per gas:", feeData.maxPriorityFeePerGas);

  // Get the factory contract
  const factoryAddress = "0x36ef7eB49670b2F262f116Dc9a984667302BF586";
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = LoanPoolFactory.attach(factoryAddress);

  // Check ownership
  const owner = await factory.owner();
  console.log("\nOwnership verification:");
  console.log("Factory owner:", owner);
  console.log("Signer address:", signer.address);
  console.log("Is signer owner:", owner.toLowerCase() === signer.address.toLowerCase());

  // Get fee collector and fee
  const feeCollectorAddress = await factory.feeCollector();
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = FeeCollector.attach(feeCollectorAddress);
  const fee = await feeCollector.getPoolCreationFee();
  console.log("\nFee details:");
  console.log("Fee collector:", feeCollectorAddress);
  console.log("Pool creation fee:", ethers.formatEther(fee), "ETH");

  // Check if pool exists
  const assetAddress = "0x91b0e3cd883c3c78f5d263d6a67f5ec86efe4414"; // PEPE token
  const existingPool = await factory.assetToPools(assetAddress);
  console.log("\nPool check:");
  console.log("Existing pool:", existingPool);

  // Get implementation details
  const implementation = await factory.implementation();
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = LendingPool.attach(implementation);
  const initialized = await lendingPool.initialized();
  console.log("\nImplementation details:");
  console.log("Implementation address:", implementation);
  console.log("Implementation initialized:", initialized);

  // Get contract addresses
  const priceOracle = await factory.priceOracle();
  const interestRateModel = await factory.interestRateModel();
  console.log("\nContract addresses:");
  console.log("Price Oracle:", priceOracle);
  console.log("Interest Rate Model:", interestRateModel);
  console.log("Fee Collector:", feeCollectorAddress);

  // Create pool
  console.log("\nCreating pool...");
  const tx = await factory.createLendingPool(
    assetAddress,
    "PEPE Lending Pool",
    "pPEPE",
    7500, // 75% collateral factor
    1000, // 10% reserve factor
    { value: fee }
  );

  const receipt = await tx.wait();
  console.log("\nTransaction receipt:");
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
  console.log("Transaction hash:", receipt.hash);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Block number:", receipt.blockNumber);

  // Get the new pool address
  const newPool = await factory.assetToPools(assetAddress);
  console.log("\nNew pool address:", newPool);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 