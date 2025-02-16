const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Checking DEX configuration with account:", deployer.address);

        // Get factory contract
        const factoryAddress = "0x2619c799294E799060e8f213Fb11a9b55293bE47";
        const Factory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX");
        const factory = Factory.attach(factoryAddress);

        // Get supported DEXes
        const supportedDEXes = await factory.getSupportedDEXes();
        console.log("\nSupported DEXes:", supportedDEXes);

        // Check each DEX configuration
        console.log("\nDEX Configurations:");
        for (const dexName of supportedDEXes) {
            const dexInfo = await factory.getDEXRouter(dexName);
            console.log(`\n${dexName}:`);
            console.log("Router:", dexInfo.router);
            console.log("Is Active:", dexInfo.isActive);
        }

    } catch (error) {
        console.error("\nError checking DEX configuration:");
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