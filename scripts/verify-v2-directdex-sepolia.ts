const hre = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
    try {
        // Contract addresses from the deployment
        const FACTORY_ADDRESS = "0xefFD5ceC6F2F46531afB2454B840e820D58697C6";
        const listingFee = ethers.parseEther("0.001"); // 0.001 ETH listing fee

        console.log("Verifying TokenFactory_v2_DirectDEX...");
        await hre.run("verify:verify", {
            address: FACTORY_ADDRESS,
            constructorArguments: [listingFee],
            contract: "src/contracts/TokenFactory_v2_DirectDEX.sol:TokenFactory_v2_DirectDEX"
        });
        console.log("TokenFactory_v2_DirectDEX verified successfully");

    } catch (error) {
        console.error("Error during verification:");
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