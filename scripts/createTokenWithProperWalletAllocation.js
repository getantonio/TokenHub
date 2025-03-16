const { ethers } = require("hardhat");

async function main() {
  // The address of the deployed factory
  const FACTORY_ADDRESS = "0xFf86c158F0cD14b1a2d18AEf8038527f71c4383b";
  
  console.log("Connecting to TokenFactory_v3 contract at:", FACTORY_ADDRESS);
  
  // Sample wallet addresses for testing
  const WALLET1 = "0x123..."; // Replace with your first wallet address
  const WALLET2 = "0x456..."; // Replace with your second wallet address
  const WALLET3 = "0x789..."; // Replace with your third wallet address
  
  // Get the contract factory
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
  
  // Attach to the deployed contract
  const factory = await TokenFactory.attach(FACTORY_ADDRESS);
  
  // Read the deployment fee
  const deploymentFee = await factory.deploymentFee();
  console.log("Current deployment fee:", ethers.utils.formatEther(deploymentFee), "BNB");
  
  // Set up token parameters with multiple wallet allocations
  const tokenParams = {
    name: "Test Token Fixed",
    symbol: "TSTFX",
    initialSupply: ethers.utils.parseEther("1000000"),
    maxSupply: ethers.utils.parseEther("1000000"),
    owner: (await ethers.getSigners())[0].address,
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
    liquidityPercentage: 10,
    liquidityLockDuration: 30 * 24 * 60 * 60, // 30 days
    walletAllocations: [
      {
        wallet: WALLET1,
        percentage: 30,
        vestingEnabled: false,
        vestingDuration: 0,
        cliffDuration: 0,
        vestingStartTime: 0
      },
      {
        wallet: WALLET2,
        percentage: 30,
        vestingEnabled: false,
        vestingDuration: 0,
        cliffDuration: 0,
        vestingStartTime: 0
      },
      {
        wallet: WALLET3,
        percentage: 30,
        vestingEnabled: true,
        vestingDuration: 90 * 24 * 60 * 60, // 90 days
        cliffDuration: 30 * 24 * 60 * 60, // 30 days cliff
        vestingStartTime: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      }
    ],
    maxActivePresales: 0,
    presaleEnabled: false
  };
  
  console.log("Creating token with parameters:");
  console.log("- Name:", tokenParams.name);
  console.log("- Symbol:", tokenParams.symbol);
  console.log("- Wallet allocations:", tokenParams.walletAllocations.length);
  
  // Create the token
  const tx = await factory.createToken(tokenParams, { value: deploymentFee });
  console.log("Transaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Transaction confirmed:", receipt.transactionHash);
  
  // Find the created token address from event logs
  const tokenCreatedEvent = receipt.events.find(event => event.event === 'TokenCreated');
  if (tokenCreatedEvent) {
    const tokenAddress = tokenCreatedEvent.args.tokenAddress;
    console.log("New token created at address:", tokenAddress);
    console.log("The token was created with proper wallet allocations");
  } else {
    console.log("Token creation event not found in logs");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 