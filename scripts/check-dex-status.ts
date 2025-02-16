const hre = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
    try {
        // Get factory contract
        const factoryAddress = "0xefFD5ceC6F2F46531afB2454B840e820D58697C6";
        const factory = await ethers.getContractAt("TokenFactory_v2_DirectDEX", factoryAddress);

        // Check DEX router
        console.log("\nChecking DEX router status...");
        const dexInfo = await factory.getDEXRouter("uniswap-test");
        console.log("DEX Info:");
        console.log("Name:", dexInfo.name);
        console.log("Router:", dexInfo.router);
        console.log("Is Active:", dexInfo.isActive);

        // Get supported DEXes
        console.log("\nSupported DEXes:");
        const supportedDEXes = await factory.getSupportedDEXes();
        console.log(supportedDEXes);

    } catch (error) {
        console.error("\nError in script execution:");
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