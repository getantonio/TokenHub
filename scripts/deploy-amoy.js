const hre = require("hardhat");

async function main() {
  console.log("Starting deployment to Polygon Amoy...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy PriceOracle
  console.log("\nDeploying PriceOracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  console.log("PriceOracle deployed to:", await priceOracle.getAddress());

  // Deploy InterestRateModel
  console.log("\nDeploying InterestRateModel...");
  const InterestRateModel = await ethers.getContractFactory("InterestRateModel");
  const interestRateModel = await InterestRateModel.deploy();
  await interestRateModel.waitForDeployment();
  console.log("InterestRateModel deployed to:", await interestRateModel.getAddress());

  // Deploy FeeCollector
  console.log("\nDeploying FeeCollector...");
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy();
  await feeCollector.waitForDeployment();
  console.log("FeeCollector deployed to:", await feeCollector.getAddress());

  // Deploy LendingPool implementation
  console.log("\nDeploying LendingPool implementation...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPoolImpl = await LendingPool.deploy();
  await lendingPoolImpl.waitForDeployment();
  console.log("LendingPool implementation deployed to:", await lendingPoolImpl.getAddress());

  // Deploy LoanPoolFactory
  console.log("\nDeploying LoanPoolFactory...");
  const LoanPoolFactory = await ethers.getContractFactory("LoanPoolFactory");
  const factory = await LoanPoolFactory.deploy(
    await lendingPoolImpl.getAddress(),
    await priceOracle.getAddress(),
    await interestRateModel.getAddress(),
    await feeCollector.getAddress()
  );
  await factory.waitForDeployment();
  console.log("LoanPoolFactory deployed to:", await factory.getAddress());
  
  // Transfer ownership of the factory to the deployer
  console.log("\nTransferring factory ownership...");
  const currentOwner = await factory.owner();
  console.log("Current owner:", currentOwner);
  console.log("Transferring to:", deployer.address);
  
  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    const tx = await factory.transferOwnership(deployer.address);
    await tx.wait();
    console.log("Ownership transferred successfully");
  } else {
    console.log("Deployer is already the owner");
  }

  // Verify contracts on Polygonscan
  console.log("\nVerifying contracts on Polygonscan...");
  try {
    await hre.run("verify:verify", {
      address: await priceOracle.getAddress(),
      constructorArguments: [],
    });
    console.log("PriceOracle verified");

    await hre.run("verify:verify", {
      address: await interestRateModel.getAddress(),
      constructorArguments: [],
    });
    console.log("InterestRateModel verified");

    await hre.run("verify:verify", {
      address: await feeCollector.getAddress(),
      constructorArguments: [],
    });
    console.log("FeeCollector verified");

    await hre.run("verify:verify", {
      address: await lendingPoolImpl.getAddress(),
      constructorArguments: [],
    });
    console.log("LendingPool implementation verified");

    await hre.run("verify:verify", {
      address: await factory.getAddress(),
      constructorArguments: [
        await lendingPoolImpl.getAddress(),
        await priceOracle.getAddress(),
        await interestRateModel.getAddress(),
        await feeCollector.getAddress(),
      ],
    });
    console.log("LoanPoolFactory verified");
  } catch (error) {
    console.log("Error verifying contracts:", error.message);
  }

  console.log("\nDeployment completed successfully!");
  console.log("\nContract addresses:");
  console.log("PriceOracle:", await priceOracle.getAddress());
  console.log("InterestRateModel:", await interestRateModel.getAddress());
  console.log("FeeCollector:", await feeCollector.getAddress());
  console.log("LendingPool implementation:", await lendingPoolImpl.getAddress());
  console.log("LoanPoolFactory:", await factory.getAddress());
  
  // Final ownership check
  const finalOwner = await factory.owner();
  console.log("\nFinal factory owner:", finalOwner);
  console.log("Is deployer the owner?", finalOwner.toLowerCase() === deployer.address.toLowerCase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 