// Create a token with the V6 factory and immediately add liquidity
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Creating token and adding liquidity with account:", deployer.address);
  
  // V6 factory address
  const factoryAddress = "0xe175397FA8D3494Ad5986cb2A2C5622AD473fB3B";
  
  // Get factory contract
  const factoryABI = [
    "function createTokenWithDistribution(string,string,uint256,address,bool,(address,uint256,string,bool,uint256,uint256)[]) external returns (address)",
    "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed owner)",
    "event DeploymentInfo(string message, address indexed target)"
  ];
  
  const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
  
  // Define token parameters
  const tokenName = "Liquidity Test Token";
  const tokenSymbol = "LTT";
  const initialSupply = ethers.parseUnits("1000000", 18); // 1 million tokens
  const includeDistribution = true;
  
  // Define wallet allocations - we'll keep 100% for the owner to simplify liquidity addition
  const ownerAddress = deployer.address;
  
  // Define wallet allocations as arrays to match the contract's expected format
  const walletAllocations = [
    [ownerAddress, 100, "Owner", false, 0, 0] // 100% to owner
  ];
  
  console.log(`Creating token "${tokenName}" (${tokenSymbol}) with the following allocations:`);
  walletAllocations.forEach(allocation => {
    console.log(`- ${allocation[2]}: ${allocation[1]}% to ${allocation[0]}`);
  });
  
  console.log("\nCreating token and sending transaction...");
  
  try {
    // Create token with custom distribution
    const tx = await factory.createTokenWithDistribution(
      tokenName,
      tokenSymbol,
      initialSupply,
      ownerAddress,
      includeDistribution,
      walletAllocations
    );
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block", receipt.blockNumber);
    
    // Find the token address from the logs and deployment info events
    let tokenAddress;
    let modules = [];
    let deploymentInfoEvents = [];
    
    for (const log of receipt.logs) {
      try {
        const parsedLog = factory.interface.parseLog(log);
        
        if (parsedLog && parsedLog.name === 'TokenCreated') {
          tokenAddress = parsedLog.args.tokenAddress;
          console.log(`Token created at: ${tokenAddress}`);
        }
        
        if (parsedLog && parsedLog.name === 'DeploymentInfo') {
          deploymentInfoEvents.push({
            message: parsedLog.args.message,
            target: parsedLog.args.target
          });
          
          // Track modules
          if (parsedLog.args.message.includes("module added")) {
            modules.push({
              type: parsedLog.args.message.split(" ")[0],
              address: parsedLog.args.target
            });
          }
        }
      } catch (error) {
        // Not a log we can parse, skip
      }
    }
    
    if (!tokenAddress) {
      console.error("Could not find token address in logs");
      return;
    }
    
    // Print deployment events
    console.log("\nDeployment Events:");
    deploymentInfoEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.message} - ${event.target}`);
    });
    
    // Print detected modules
    console.log("\nDetected Modules:");
    modules.forEach((module, index) => {
      console.log(`${index + 1}. ${module.type} - ${module.address}`);
    });
    
    // Find the liquidity module
    const liquidityModule = modules.find(m => m.type === "Liquidity");
    
    if (!liquidityModule) {
      console.error("Could not find liquidity module from deployment events");
      return;
    }
    
    console.log(`\nUsing liquidity module at: ${liquidityModule.address}`);
    
    // Get the token contract
    const tokenABI = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)"
    ];
    
    const token = new ethers.Contract(tokenAddress, tokenABI, deployer);
    
    // Get token details
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    const ownerBalance = await token.balanceOf(deployer.address);
    
    console.log(`\nToken Details:`);
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
    console.log(`Your Balance: ${ethers.formatUnits(ownerBalance, decimals)} ${symbol}`);
    
    // Determine amount of tokens to add to liquidity (10% of total supply)
    // Calculate 10% of total supply using BigInt division
    const tokenAmount = totalSupply * BigInt(10) / BigInt(100); // 10% of total supply
    const ethAmount = ethers.parseEther("0.01"); // 0.01 ETH for testing
    
    console.log(`\nPreparing to add liquidity:`);
    console.log(`- ${ethers.formatUnits(tokenAmount, decimals)} ${symbol} tokens`);
    console.log(`- ${ethers.formatEther(ethAmount)} ETH`);
    
    // Approve the liquidity module to spend tokens
    console.log("\nApproving token transfer...");
    const approveTx = await token.approve(liquidityModule.address, tokenAmount);
    console.log(`Approval transaction sent: ${approveTx.hash}`);
    await approveTx.wait();
    console.log("Approval transaction confirmed!");
    
    // Now add liquidity
    const liquidityModuleABI = [
      "function addLiquidity(uint256 tokenAmount) payable returns (bool success)",
      "function getLPTokenBalance(address) view returns (uint256)",
      "function getReserves() view returns (uint256, uint256)",
      "function lockLiquidity(uint256 duration) returns (bool)"
    ];
    
    const liquidityModuleContract = new ethers.Contract(liquidityModule.address, liquidityModuleABI, deployer);
    
    console.log("\nAdding liquidity...");
    try {
      const addLiquidityTx = await liquidityModuleContract.addLiquidity(tokenAmount, {
        value: ethAmount
      });
      console.log(`Add liquidity transaction sent: ${addLiquidityTx.hash}`);
      
      const addReceipt = await addLiquidityTx.wait();
      console.log("Add liquidity transaction confirmed in block", addReceipt.blockNumber);
      
      // Check new liquidity
      try {
        const [tokenReserve, ethReserve] = await liquidityModuleContract.getReserves();
        console.log(`\nNew liquidity pool reserve:`);
        console.log(`Token Reserve: ${ethers.formatUnits(tokenReserve, decimals)} ${symbol}`);
        console.log(`ETH Reserve: ${ethers.formatEther(ethReserve)} ETH`);
        
        // Lock liquidity for 1 day (86400 seconds)
        console.log("\nLocking liquidity for 1 day...");
        const lockTx = await liquidityModuleContract.lockLiquidity(86400);
        console.log(`Lock transaction sent: ${lockTx.hash}`);
        await lockTx.wait();
        console.log("Liquidity locked successfully!");
        
        console.log("\nLiquidity addition completed successfully!");
        console.log(`\nView token on explorer: https://www.oklink.com/amoy/token/${tokenAddress}`);
      } catch (error) {
        console.error("Error checking reserves:", error.message);
      }
    } catch (error) {
      console.error("Error adding liquidity:", error.message);
      if (error.data) {
        console.error("Error data:", error.data);
      }
    }
  } catch (error) {
    console.error("Error creating token:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 