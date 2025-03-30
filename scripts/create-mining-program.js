const { ethers } = require("hardhat");

async function main() {
  // Get arguments from command line
  const factoryAddress = process.env.FACTORY_ADDRESS;
  const poolAddress = process.env.POOL_ADDRESS;
  const tokenName = process.env.TOKEN_NAME || "Lending Reward Token";
  const tokenSymbol = process.env.TOKEN_SYMBOL || "LRT";
  const rewardRate = ethers.utils.parseEther(process.env.REWARD_RATE || "0.1"); // 0.1 tokens per second
  const maxSupply = ethers.utils.parseEther(process.env.MAX_SUPPLY || "10000000"); // 10 million tokens
  const initialSupply = ethers.utils.parseEther(process.env.INITIAL_SUPPLY || "1000000"); // 1 million tokens
  
  if (!factoryAddress) {
    throw new Error("FACTORY_ADDRESS environment variable is required");
  }
  
  if (!poolAddress) {
    throw new Error("POOL_ADDRESS environment variable is required");
  }
  
  console.log("Creating liquidity mining program with parameters:");
  console.log("- Factory:", factoryAddress);
  console.log("- Pool:", poolAddress);
  console.log("- Token Name:", tokenName);
  console.log("- Token Symbol:", tokenSymbol);
  console.log("- Reward Rate:", ethers.utils.formatEther(rewardRate), "tokens per second");
  console.log("- Max Supply:", ethers.utils.formatEther(maxSupply), "tokens");
  console.log("- Initial Supply:", ethers.utils.formatEther(initialSupply), "tokens");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Connect to LiquidityMiningFactory
  const LiquidityMiningFactory = await ethers.getContractFactory("LiquidityMiningFactory");
  const factory = LiquidityMiningFactory.attach(factoryAddress);
  
  // Create mining program
  console.log("Creating mining program...");
  const tx = await factory.createMiningProgram(
    poolAddress,
    tokenName,
    tokenSymbol,
    rewardRate,
    maxSupply,
    initialSupply
  );
  
  console.log("Transaction submitted:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);
  
  // Get the created mining program and token addresses from events
  const event = receipt.events.find(e => e.event === "MiningProgramCreated");
  const miningProgramAddress = event.args.miningProgram;
  const rewardTokenAddress = event.args.rewardToken;
  
  console.log("Mining program created successfully!");
  console.log("- Mining Program:", miningProgramAddress);
  console.log("- Reward Token:", rewardTokenAddress);
  
  // Save the addresses for later use
  const programInfo = {
    pool: poolAddress,
    miningProgram: miningProgramAddress,
    rewardToken: rewardTokenAddress,
    tokenName,
    tokenSymbol
  };
  
  console.log("Program info:", programInfo);
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 