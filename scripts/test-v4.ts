const hardhat = require("hardhat");
const ethers = hardhat.ethers;

async function main() {
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Get factory contract
    const factoryAddress = "0x8ba73472B62a2993E4aB5033CAa398ad118DDD77";
    const factory = await ethers.getContractAt("V4Factory", factoryAddress);
    
    // Create a new token
    console.log("\nCreating new token...");
    const tx = await factory.createToken(
        "Test Token",
        "TEST",
        ethers.parseUnits("1000000", 18),
        deployer.address,
        true // Include distribution module
    );
    
    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Get the token address from the event
    const tokenCreatedEvent = receipt.logs.find(
        log => log.topics[0] === ethers.id("TokenCreated(address,string,string,address)")
    );
    
    if (!tokenCreatedEvent) {
        throw new Error("TokenCreated event not found");
    }
    
    const tokenAddress = ethers.dataSlice(tokenCreatedEvent.topics[1], 12);
    console.log("\nToken created at:", tokenAddress);
    
    // Get token instance
    const token = await ethers.getContractAt("V4TokenBase", tokenAddress);
    
    // Get token info
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const owner = await token.owner();
    
    console.log("\nToken Info:");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Total Supply:", ethers.formatUnits(totalSupply, 18));
    console.log("Owner:", owner);
    
    // Get modules
    const modules = await token.getModules();
    console.log("\nActive Modules:", modules);
}

// Execute the test
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main }; 