const { ethers } = require('hardhat');
require('@nomicfoundation/hardhat-ethers');

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Adding DEX with account:", deployer.address);

        const factoryAddress = '0xE5dB0C6eF854ace899f970794541F5b351d0341F';
        const factory = await ethers.getContractAt("TokenFactory_v2_DirectDEX", factoryAddress);

        // Add PancakeSwap Testnet as supported DEX
        console.log("\nAdding PancakeSwap Testnet as supported DEX...");
        const addDexTx = await factory.addDEX(
            "pancakeswap-test",
            "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3" // PancakeSwap Testnet Router
        );
        await addDexTx.wait();
        console.log("Added PancakeSwap Testnet as supported DEX");

        // Verify the DEX was added
        const dexRouter = await factory.getDEXRouter("pancakeswap-test");
        console.log("\nDEX Configuration:");
        console.log("Name:", "pancakeswap-test");
        console.log("Router:", dexRouter.router);
        console.log("Is Active:", dexRouter.isActive);

    } catch (error) {
        console.error("\nFailed to add DEX!");
        console.error("Error details:", error);
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