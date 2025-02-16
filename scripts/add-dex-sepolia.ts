const hre = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Checking DEX with account:", deployer.address);

        // Get factory contract
        const factoryAddress = "0xefFD5ceC6F2F46531afB2454B840e820D58697C6";
        const factory = await ethers.getContractAt("TokenFactory_v2_DirectDEX", factoryAddress);

        // Uniswap V2 router address on Sepolia
        const UNISWAP_V2_ROUTER_SEPOLIA = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

        // Check if DEX already exists
        try {
            const dexInfo = await factory.getDEXRouter("uniswap-test");
            console.log("\nExisting DEX Info:");
            console.log("Name:", dexInfo.name);
            console.log("Router:", dexInfo.router);
            console.log("Is Active:", dexInfo.isActive);
            
            if (dexInfo.isActive) {
                console.log("\nDEX is already added and active. No action needed.");
                return;
            }
        } catch (error) {
            // DEX doesn't exist, proceed with adding it
            console.log("\nDEX not found. Adding Uniswap V2 router...");
            const addDexTx = await factory.addDEX(
                "uniswap-test",
                UNISWAP_V2_ROUTER_SEPOLIA,
                {
                    gasLimit: 2000000,
                    maxFeePerGas: ethers.parseUnits("10", "gwei"),
                    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
                }
            );
            
            console.log("Transaction hash:", addDexTx.hash);
            await addDexTx.wait();
            console.log("Uniswap V2 router added successfully");

            // Verify the DEX was added
            const dexInfo = await factory.getDEXRouter("uniswap-test");
            console.log("\nNew DEX Info:");
            console.log("Name:", dexInfo.name);
            console.log("Router:", dexInfo.router);
            console.log("Is Active:", dexInfo.isActive);
        }

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