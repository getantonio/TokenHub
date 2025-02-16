const hre = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
    try {
        // Get factory contract
        const factoryAddress = "0xefFD5ceC6F2F46531afB2454B840e820D58697C6";
        const factory = await ethers.getContractAt("TokenFactory_v2_DirectDEX", factoryAddress);

        const listingFee = await factory.getListingFee();
        console.log("Listing fee:", ethers.formatEther(listingFee), "ETH");

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