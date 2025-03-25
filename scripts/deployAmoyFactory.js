const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment of AmoyTokenFactory on Polygon Amoy...");
  
  try {
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deployer account:", deployer.address);
    
    // Get the network details to verify we're on Polygon Amoy
    const network = await ethers.provider.getNetwork();
    console.log("Network:", {
      name: network.name,
      chainId: network.chainId.toString()
    });
    
    if (network.chainId.toString() !== "80002") {
      throw new Error("This script is intended for Polygon Amoy only. Please use --network polygonamoy");
    }
    
    // Get fee setting from environment or use default
    const deploymentFee = process.env.DEPLOYMENT_FEE 
      ? ethers.parseUnits(process.env.DEPLOYMENT_FEE, "ether")
      : ethers.parseUnits("0.0001", "ether");
    
    console.log("Using deployment fee:", ethers.formatUnits(deploymentFee, "ether"), "ETH");
    
    // Compile the factory contract
    console.log("Compiling contracts...");
    const AmoyTokenFactory = await ethers.getContractFactory("AmoyTokenFactory");
    
    // Deploy the factory
    console.log("Deploying AmoyTokenFactory...");
    const factory = await AmoyTokenFactory.deploy(deploymentFee);
    await factory.deploymentTransaction().wait();
    
    console.log("Factory deployed at:", factory.target);
    console.log("Transaction hash:", factory.deploymentTransaction().hash);
    
    // Wait for a few seconds to let the blockchain confirm the deployment
    console.log("Waiting for deployment confirmation...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify the deployment by reading factory information
    console.log("Verifying deployment...");
    
    const fee = await factory.deploymentFee();
    const owner = await factory.owner();
    
    console.log("Factory verified with details:");
    console.log("  Deployment fee:", ethers.formatUnits(fee, "ether"), "ETH");
    console.log("  Owner:", owner);
    
    // Save the deployment info to a file
    const deploymentInfo = {
      network: "Polygon Amoy",
      chainId: network.chainId.toString(),
      factoryAddress: factory.target,
      deploymentFee: ethers.formatUnits(fee, "ether"),
      deploymentTx: factory.deploymentTransaction().hash,
      deployDate: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, "../amoy-factory-info.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("Deployment information saved to amoy-factory-info.json");
    console.log("");
    console.log("To use this factory in your app, update your environment variables:");
    console.log(`NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1=${factory.target}`);
    
    // Test the factory by creating a test token
    if (process.env.TEST_FACTORY === "true") {
      console.log("\nTesting factory with a test token creation...");
      
      const testTokenTx = await factory.createToken(
        "TestToken",
        "TEST",
        1000,
        { value: deploymentFee }
      );
      
      console.log("Test token creation transaction sent:", testTokenTx.hash);
      
      const receipt = await testTokenTx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);
      
      // Find the token address from the event logs
      let tokenAddress = null;
      for (const log of receipt.logs) {
        try {
          const decoded = factory.interface.parseLog(log);
          if (decoded && decoded.name === "TokenCreated") {
            tokenAddress = decoded.args[0];
            break;
          }
        } catch (e) {
          // Skip logs that can't be parsed
          continue;
        }
      }
      
      if (tokenAddress) {
        console.log("Test token created at:", tokenAddress);
        
        // Verify the token
        const CustomTinyToken = await ethers.getContractFactory("CustomTinyToken");
        const token = CustomTinyToken.attach(tokenAddress);
        
        const name = await token.name();
        const symbol = await token.symbol();
        const totalSupply = await token.totalSupply();
        const decimals = await token.decimals();
        
        console.log("Token details:");
        console.log("  Name:", name);
        console.log("  Symbol:", symbol);
        console.log("  Total Supply:", ethers.formatUnits(totalSupply, decimals));
        console.log("  Decimals:", decimals.toString());
      } else {
        console.log("Could not find token address in transaction logs");
      }
      
      // Check if the token is properly registered in the factory
      const userTokens = await factory.getTokensByUser(deployer.address);
      console.log("\nTokens created by user:", userTokens);
      
      if (userTokens.length > 0) {
        console.log("First token from factory:", userTokens[0]);
        const isFromFactory = await factory.isTokenFromFactory(userTokens[0]);
        console.log("Is token from factory:", isFromFactory);
      }
    }
    
  } catch (error) {
    console.error("Error deploying factory:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 