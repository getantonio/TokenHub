require('dotenv').config();
const hre = require("hardhat");

async function main() {
    const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS;
    
    if (!FACTORY_ADDRESS) {
        throw new Error('Factory address not set in environment variables');
    }

    console.log('Verifying TokenFactory_v2_Bake_v2 at:', FACTORY_ADDRESS);

    // Get listing fee from environment variable or use default
    const listingFee = process.env.FACTORY_FEE ? 
        hre.ethers.parseEther(process.env.FACTORY_FEE) : 
        hre.ethers.parseEther('0.0001'); // Default 0.0001 ETH

    try {
        await hre.run("verify:verify", {
            address: FACTORY_ADDRESS,
            constructorArguments: [listingFee],
            contract: "src/contracts/TokenFactory_v2_Bake_v2.sol:TokenFactory_v2_Bake_v2"
        });
        console.log('Contract verified successfully');
    } catch (error) {
        console.error('Error verifying contract:', error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 