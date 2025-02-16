const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Adding DEX with account:", deployer.address);

        // Get factory contract
        const factoryAddress = "0xF0Fa40d9A6Ce543F917E073FA409a27DA5bE36fB"; // Bake factory address
        const Factory = await ethers.getContractFactory("TokenFactory_v2_Bake");
        const factory = Factory.attach(factoryAddress);

        // Uniswap V2 Router address (Sepolia)
        const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

        console.log("\nAdding Uniswap DEX...");
        const tx = await factory.addDEX("uniswap-test", UNISWAP_ROUTER);
        console.log("Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);

        // Verify DEX was added
        const dexInfo = await factory.getDEXRouter("uniswap-test");
        console.log("\nDEX Configuration:");
        console.log("Name: uniswap-test");
        console.log("Router:", dexInfo.router);
        console.log("Is Active:", dexInfo.isActive);

    } catch (error) {
        console.error("\nError adding DEX:");
        console.error(error);
        process.exit(1);
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 