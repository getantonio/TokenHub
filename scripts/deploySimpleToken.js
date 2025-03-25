const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying SimpleToken on Polygon Amoy...");
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer address:", deployerAddress);
  
  // Check network
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "(Chain ID:", network.chainId, ")");
  
  // Token parameters 
  const name = "Simple Tester";
  const symbol = "SIMP";
  const decimals = 18;
  const initialSupply = 10000; // Will be multiplied by 10^18 in the contract
  
  console.log("Token parameters:");
  console.log("- Name:", name);
  console.log("- Symbol:", symbol);
  console.log("- Decimals:", decimals);
  console.log("- Initial Supply:", initialSupply);
  
  // Get the contract factory
  const SimpleToken = await ethers.getContractFactory("SimpleToken");
  
  // Deploy with low gas limit for Polygon Amoy
  console.log("Deploying token...");
  const deployOptions = {
    gasLimit: 3000000
  };
  
  try {
    // Deploy using the current ethers.js version
    const deployTx = await SimpleToken.deploy(
      name,
      symbol,
      decimals,
      initialSupply,
      deployOptions
    );
    
    console.log("Deployment transaction sent:", deployTx.deploymentTransaction().hash);
    console.log("Waiting for confirmation...");
    
    await deployTx.waitForDeployment();
    const tokenAddress = await deployTx.getAddress();
    
    console.log("✅ SimpleToken deployed to:", tokenAddress);
    console.log("Add this token to MetaMask with:");
    console.log("- Address:", tokenAddress);
    console.log("- Symbol:", symbol);
    console.log("- Decimals:", decimals);
    
    // Verify the deployment worked
    try {
      const deployedName = await deployTx.name();
      const deployedSymbol = await deployTx.symbol();
      const deployedDecimals = await deployTx.decimals();
      const deployedTotalSupply = await deployTx.totalSupply();
      const ownerBalance = await deployTx.balanceOf(deployerAddress);
      
      console.log("\nToken details verification:");
      console.log("- Name:", deployedName);
      console.log("- Symbol:", deployedSymbol);
      console.log("- Decimals:", deployedDecimals.toString());
      console.log("- Total Supply:", ethers.formatUnits(deployedTotalSupply, decimals));
      console.log("- Owner Balance:", ethers.formatUnits(ownerBalance, decimals));
    } catch (error) {
      console.log("Could not verify token details, but deployment completed:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error deploying token:", error);
    if (error.error && error.error.message) {
      console.error("Error message:", error.error.message);
    }
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 