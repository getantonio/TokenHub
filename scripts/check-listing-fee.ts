const hre = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
    try {
        // Get factory contract
        const factoryAddress = "0xc300648556860006771f1f982d3dDE65A54C1BA0";
        const factory = await ethers.getContractAt("TokenFactory_v2_DirectDEX_TwoStep", factoryAddress);

        const listingFee = await factory.listingFee();
        console.log("Listing fee:", ethers.formatEther(listingFee), "ETH");

    } catch (error) {
        console.error("\nError in script execution:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 