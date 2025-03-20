const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Adding liquidity with account:", deployer.address);

  // Token and factory addresses - replace with your deployed addresses
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const factoryAddress = process.env.FACTORY_ADDRESS;
  
  if (!tokenAddress || !factoryAddress) {
    console.error("Please set TOKEN_ADDRESS and FACTORY_ADDRESS environment variables");
    process.exit(1);
  }
  
  console.log("Token address:", tokenAddress);
  console.log("Factory address:", factoryAddress);

  // Amount of ETH to add for liquidity
  const ethAmount = process.env.ETH_AMOUNT || "0.1";
  const ethAmountWei = ethers.parseEther(ethAmount);
  console.log(`Adding ${ethAmount} ETH for liquidity`);

  // Get contract instances
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_Updated");
  const tokenFactory = TokenFactory.attach(factoryAddress);
  
  const Token = await ethers.getContractFactory("Token_v3_Updated");
  const token = Token.attach(tokenAddress);

  // Check token balance in contract
  const contractBalance = await token.balanceOf(tokenAddress);
  console.log(`Token contract balance: ${ethers.formatEther(contractBalance)} tokens`);
  
  if (contractBalance.isZero()) {
    console.error("No tokens in contract to add liquidity with");
    process.exit(1);
  }

  // Method 1: Use factory's addLiquidityToToken function
  console.log("\nMethod 1: Using factory's addLiquidityToToken function...");
  try {
    const tx1 = await tokenFactory.addLiquidityToToken(tokenAddress, {
      value: ethAmountWei
    });
    console.log("Transaction hash:", tx1.hash);
    await tx1.wait();
    console.log("Liquidity added successfully using factory");
  } catch (error) {
    console.error("Error using factory method:", error.message);
    
    // Method 2: Call token's addLiquidityFromContractTokens function directly
    console.log("\nMethod 2: Calling token's addLiquidityFromContractTokens function directly...");
    try {
      const tx2 = await token.addLiquidityFromContractTokens({
        value: ethAmountWei
      });
      console.log("Transaction hash:", tx2.hash);
      await tx2.wait();
      console.log("Liquidity added successfully using direct token call");
    } catch (error) {
      console.error("Error using direct token method:", error.message);
      process.exit(1);
    }
  }

  // Check if pair was created
  const pairAddress = await token.uniswapV2Pair();
  console.log("\nUniswap pair address:", pairAddress);
  
  console.log("Liquidity added successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 