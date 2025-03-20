const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Creating token with account:", deployer.address);

  // Get the factory address
  const factoryAddress = process.env.FACTORY_ADDRESS;
  if (!factoryAddress) {
    console.error("Please set FACTORY_ADDRESS environment variable");
    process.exit(1);
  }
  console.log("Factory address:", factoryAddress);

  // Get contract instance
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_Updated");
  const tokenFactory = TokenFactory.attach(factoryAddress);

  // Check deployment fee
  const deploymentFee = await tokenFactory.deploymentFee();
  console.log(`Deployment fee: ${ethers.formatEther(deploymentFee)} ETH`);

  // Token parameters
  const tokenParams = {
    name: "Test Token",
    symbol: "TEST",
    initialSupply: ethers.parseEther("1000000"),
    maxSupply: ethers.parseEther("1000000"),
    owner: deployer.address,
    enableBlacklist: true,
    enableTimeLock: true,
    presaleRate: 0,
    softCap: 0,
    hardCap: 0,
    minContribution: 0,
    maxContribution: 0,
    startTime: 0,
    endTime: 0,
    presalePercentage: 0,
    liquidityPercentage: 20,
    liquidityLockDuration: 0,
    walletAllocations: [
      {
        wallet: deployer.address,
        percentage: 80,
        vestingEnabled: false,
        vestingDuration: 0,
        cliffDuration: 0,
        vestingStartTime: 0
      }
    ],
    maxActivePresales: 0,
    presaleEnabled: false
  };

  // Create token
  console.log("Creating token...");
  const tx = await tokenFactory.createToken(tokenParams, {
    value: deploymentFee
  });
  console.log(`Transaction hash: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log("Token created!");

  // Get the token address from the event
  const tokenCreatedEvent = receipt.logs
    .filter(log => log.topics[0] === ethers.id("TokenCreated(address,address,string,string,uint256,uint256,bool)"))
    .map(log => {
      const parsedLog = tokenFactory.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
      return parsedLog.args;
    })[0];

  if (!tokenCreatedEvent) {
    console.error("Failed to get token address from event");
    process.exit(1);
  }

  const tokenAddress = tokenCreatedEvent[1];
  console.log(`Token address: ${tokenAddress}`);

  // Add token address to .env for later use
  console.log(`\nAdd this to your .env file:`);
  console.log(`TOKEN_ADDRESS=${tokenAddress}`);
  
  // Now add liquidity
  console.log("\nAdding liquidity...");
  
  const Token = await ethers.getContractFactory("Token_v3_Updated");
  const token = Token.attach(tokenAddress);
  
  // Check token balance
  const contractBalance = await token.balanceOf(tokenAddress);
  console.log(`Token contract balance: ${ethers.formatEther(contractBalance)} tokens`);
  
  // Add liquidity directly through the token
  const ethAmount = ethers.parseEther("0.1");
  console.log(`Adding ${ethers.formatEther(ethAmount)} ETH for liquidity...`);
  
  const addLiquidityTx = await token.addLiquidityFromContractTokens({
    value: ethAmount
  });
  
  console.log(`Transaction hash: ${addLiquidityTx.hash}`);
  await addLiquidityTx.wait();
  
  // Check if pair was created
  const pairAddress = await token.uniswapV2Pair();
  console.log(`Uniswap pair address: ${pairAddress}`);
  
  console.log("Liquidity added successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 