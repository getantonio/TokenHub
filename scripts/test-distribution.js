const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  console.log("Testing token distribution with V4FactoryWithLiquidityFixedV4...");
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Get the V4 factory address
  const factoryAddress = "0xe063C5263243286a8B20159f2C73132A136c354A"; // V4 factory with custom distribution
  
  // Create a contract instance
  const factoryABI = [
    "function createToken(string,string,uint256,address) returns (address)",
    "function createTokenForWeb(string,string,uint256,address,bool) returns (address)",
    "function createTokenWithDistribution(string,string,uint256,address,bool,(address,uint256,string,bool,uint256,uint256)[]) returns (address)",
    "function getTokenImplementation() view returns (address)",
    "function getSecurityModuleImplementation() view returns (address)",
    "function getDistributionModuleImplementation() view returns (address)",
    "function getLiquidityModuleImplementation() view returns (address)",
    "function getAllTokens() view returns (address[])",
    "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed owner)"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Token parameters
  const tokenName = "Test Distribution Token";
  const tokenSymbol = "TDT";
  const initialSupply = ethers.parseUnits("1000000", 18);
  const owner = deployer.address;
  
  // Create wallet allocations
  // Define some test wallets
  const wallet1 = deployer.address;
  // These are sample addresses - for a real test, you'd use addresses you control
  const wallet2 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Sample test address
  const wallet3 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Sample test address
  
  const walletAllocations = [
    [
      wallet1, // Owner wallet
      60, // 60% allocation
      "Owner", // Label
      false, // No vesting
      0, // No vesting duration
      0 // No cliff
    ],
    [
      wallet2, // Team wallet
      25, // 25% allocation
      "Team", // Label
      true, // With vesting
      365, // 1 year vesting duration
      90 // 90 day cliff
    ],
    [
      wallet3, // Marketing wallet
      15, // 15% allocation
      "Marketing", // Label
      true, // With vesting
      180, // 6 month vesting duration
      30 // 30 day cliff
    ]
  ];
  
  console.log("Creating token with the following allocations:");
  walletAllocations.forEach(allocation => {
    console.log(`- ${allocation[2]}: ${allocation[1]}% to ${allocation[0]}`);
    if (allocation[3]) {
      console.log(`  Vesting: ${allocation[4]} days with ${allocation[5]} day cliff`);
    }
  });
  
  // Create the token with distribution
  try {
    console.log("Creating token with distribution...");
    const tx = await factory.createTokenWithDistribution(
      tokenName,
      tokenSymbol,
      initialSupply,
      owner,
      true, // Include distribution
      walletAllocations
    );
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Get the token address from the event
    const event = receipt.logs
      .map(log => {
        try {
          return factory.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find(event => event && event.name === 'TokenCreated');
    
    if (event) {
      const tokenAddress = event.args.tokenAddress;
      console.log("Token created at address:", tokenAddress);
      console.log("Check the token balances at:", `https://amoy.polygonscan.com/token/${tokenAddress}`);
    } else {
      console.log("Event not found, token creation might have failed");
    }
  } catch (error) {
    console.error("Error creating token:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 