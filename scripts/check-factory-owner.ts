const hre = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Checking with account:", deployer.address);

        // Get factory contract
        const factoryAddress = "0xefFD5ceC6F2F46531afB2454B840e820D58697C6";
        const factory = await ethers.getContractAt("TokenFactory_v2_DirectDEX", factoryAddress);

        // Get owner
        const owner = await factory.owner();
        console.log("\nFactory owner:", owner);
        console.log("Is caller the owner?", owner.toLowerCase() === deployer.address.toLowerCase());

        // Get DEX info
        const dexInfo = await factory.getDEXRouter("uniswap-test");
        console.log("\nDEX Info:");
        console.log("Name:", dexInfo.name);
        console.log("Router:", dexInfo.router);
        console.log("Is Active:", dexInfo.isActive);

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