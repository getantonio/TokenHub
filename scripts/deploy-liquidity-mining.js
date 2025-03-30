const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Liquidity Mining contracts...");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy implementation contracts (these won't be used directly)
  
  // 1. Deploy RewardToken implementation
  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardTokenImpl = await RewardToken.deploy();
  await rewardTokenImpl.deployed();
  console.log("RewardToken implementation deployed to:", rewardTokenImpl.address);

  // 2. Deploy LiquidityMining implementation
  const LiquidityMining = await ethers.getContractFactory("LiquidityMining");
  const liquidityMiningImpl = await LiquidityMining.deploy();
  await liquidityMiningImpl.deployed();
  console.log("LiquidityMining implementation deployed to:", liquidityMiningImpl.address);

  // 3. Deploy LiquidityMiningFactory
  const LiquidityMiningFactory = await ethers.getContractFactory("LiquidityMiningFactory");
  const liquidityMiningFactory = await LiquidityMiningFactory.deploy(
    liquidityMiningImpl.address,
    rewardTokenImpl.address
  );
  await liquidityMiningFactory.deployed();
  console.log("LiquidityMiningFactory deployed to:", liquidityMiningFactory.address);

  console.log("Liquidity Mining system deployment complete!");
  
  // Save the addresses for verification
  const deploymentInfo = {
    rewardTokenImpl: rewardTokenImpl.address,
    liquidityMiningImpl: liquidityMiningImpl.address,
    liquidityMiningFactory: liquidityMiningFactory.address
  };
  
  console.log("Deployment info:", deploymentInfo);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 