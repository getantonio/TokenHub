const hre = require('hardhat');

async function main() {
    try {
        // Get a sample token address from the factory
        const factory = await hre.ethers.getContractAt(
            "TokenFactory_v2_DirectDEX",
            "0xefFD5ceC6F2F46531afB2454B840e820D58697C6"
        );

        // We need a token address to verify the template
        console.log("Please create a token first using the factory.");
        console.log("Then run this script with the token address as an argument.");
        console.log("Usage: npx hardhat run scripts/verify-template-v2-directdex-sepolia.ts --network sepolia <token_address>");

        const tokenAddress = process.argv[2];
        if (!tokenAddress) {
            console.log("No token address provided.");
            return;
        }

        // Verify that this is a valid token from our factory
        const isListed = await factory.isListed(tokenAddress);
        if (!isListed) {
            console.log("This token was not created by our factory.");
            return;
        }

        console.log("Verifying TokenTemplate_v2DirectDEX implementation at", tokenAddress);
        await hre.run("verify:verify", {
            address: tokenAddress,
            contract: "src/contracts/TokenTemplate_v2DirectDEX.sol:TokenTemplate_v2DirectDEX"
        });
        console.log("TokenTemplate_v2DirectDEX implementation verified successfully");

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