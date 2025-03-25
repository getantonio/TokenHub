const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting direct token deployment on Polygon Amoy...");
  
  try {
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deploying from account:", deployer.address);
    
    // Get the network details to verify we're on Polygon Amoy
    const network = await ethers.provider.getNetwork();
    console.log("Network:", {
      name: network.name,
      chainId: network.chainId.toString()
    });
    
    if (network.chainId.toString() !== "80002") {
      throw new Error("This script is intended for Polygon Amoy only. Please use --network polygonamoy");
    }
    
    // Get the token parameters from command line arguments or use defaults
    const tokenName = process.env.TOKEN_NAME || "MyToken";
    const tokenSymbol = process.env.TOKEN_SYMBOL || "MTK";
    const initialSupply = process.env.INITIAL_SUPPLY || "1000";
    const maxSupply = process.env.MAX_SUPPLY || "10000";
    
    console.log("Deploying token with parameters:", {
      name: tokenName,
      symbol: tokenSymbol,
      initialSupply: initialSupply,
      maxSupply: maxSupply
    });
    
    // Compile the TinyToken contract
    const TinyToken = await ethers.getContractFactory("TinyToken");
    
    // Deploy the token
    console.log("Deploying token...");
    const token = await TinyToken.deploy();
    await token.deploymentTransaction().wait();
    
    console.log("Token deployed at:", token.target);
    console.log("Transaction hash:", token.deploymentTransaction().hash);
    
    // Wait for a few seconds to let the blockchain confirm the deployment
    console.log("Waiting for deployment confirmation...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify the deployment by reading token information
    console.log("Verifying deployment...");
    
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    
    console.log("Token verified with details:");
    console.log("  Name:", name);
    console.log("  Symbol:", symbol);
    console.log("  Decimals:", decimals.toString());
    console.log("  Total Supply:", ethers.formatUnits(totalSupply, decimals));
    
    // Save the deployment info to a file
    const deploymentInfo = {
      network: "Polygon Amoy",
      chainId: network.chainId.toString(),
      tokenAddress: token.target,
      tokenName: name,
      tokenSymbol: symbol,
      deploymentTx: token.deploymentTransaction().hash,
      deployDate: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, "../deployment-info.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("Deployment information saved to deployment-info.json");
    console.log("");
    console.log("Add this token to your wallet:");
    console.log("  Address:", token.target);
    console.log("  Symbol:", symbol);
    console.log("  Decimals:", decimals.toString());
    
  } catch (error) {
    console.error("Error deploying token:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 