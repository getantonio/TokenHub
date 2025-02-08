const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Creating test token with account:", deployer.address);

  // Get the factory contract
  const factoryAddress = "0x61bd5538a41E42B6EDd88b71f056521Aa4b27671"; // TokenFactory_v3_clone address
  const TokenFactory = await ethers.getContractFactory("TokenFactory_v3_clone");
  const factory = TokenFactory.attach(factoryAddress);

  // Set up token parameters
  const now = Math.floor(Date.now() / 1000);
  const startTime = BigInt(now + 24 * 60 * 60); // 24 hours from now
  const endTime = BigInt(now + 14 * 24 * 60 * 60); // 14 days from now

  const params = {
    name: "Test Token",
    symbol: "TEST",
    initialSupply: ethers.parseEther("1000000"),
    maxSupply: ethers.parseEther("1000000"),
    owner: deployer.address,
    enableBlacklist: false,
    enableTimeLock: false,
    presaleRate: ethers.parseEther("1000"), // 1000 tokens per ETH
    minContribution: ethers.parseEther("0.1"), // 0.1 ETH
    maxContribution: ethers.parseEther("10"), // 10 ETH
    presaleCap: ethers.parseEther("100"), // 100 ETH
    startTime,
    endTime,
    presalePercentage: 35, // 35%
    liquidityPercentage: 60, // 60%
    liquidityLockDuration: 180 // 180 days
  };

  console.log("Creating token with parameters:", {
    ...params,
    initialSupply: params.initialSupply.toString(),
    maxSupply: params.maxSupply.toString(),
    presaleRate: params.presaleRate.toString(),
    minContribution: params.minContribution.toString(),
    maxContribution: params.maxContribution.toString(),
    presaleCap: params.presaleCap.toString(),
    startTime: params.startTime.toString(),
    endTime: params.endTime.toString()
  });

  try {
    // Get deployment fee
    const deploymentFee = await factory.deploymentFee();
    console.log("Deployment fee:", ethers.formatEther(deploymentFee), "ETH");

    // Create token
    const tx = await factory.createToken(params, { value: deploymentFee });
    console.log("Transaction hash:", tx.hash);

    // Wait for transaction to be mined
    console.log("Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    
    // Find TokenCreated event
    const event = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed.name === "TokenCreated";
      } catch (e) {
        return false;
      }
    });

    if (event) {
      const parsedEvent = factory.interface.parseLog(event);
      console.log("Token created successfully!");
      console.log("Token address:", parsedEvent.args.tokenAddress);
      console.log("Token name:", parsedEvent.args.name);
      console.log("Token symbol:", parsedEvent.args.symbol);
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