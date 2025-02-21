const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log('\n=== Checking Token Status ===\n');
    
    const [deployer] = await ethers.getSigners();
    console.log('Account:', deployer.address);
    
    const factoryAddress = "0xC1588c628615e4bBbA40De630ECa8Dd2DFCD2a9D";
    console.log('Factory address:', factoryAddress);
    
    // Get the contract factory
    const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_TwoStep");
    const factory = TokenFactory.attach(factoryAddress);
    
    // Token addresses to check
    const tokenAddresses = [
        "0x2a9eb71954340aC02460d0C2bf22831b3c6F4E59",
        "0x44CA548504505CA3258ddf412834C611BE30574f"
    ];
    
    // Check factory balance
    const balance = await ethers.provider.getBalance(factoryAddress);
    console.log('\nFactory balance:', ethers.formatEther(balance), 'ETH');
    
    // Check each token
    for (const tokenAddress of tokenAddresses) {
        console.log(`\nChecking token: ${tokenAddress}`);
        
        try {
            // Get token info
            const tokenInfo = await factory.getTokenInfo(tokenAddress);
            console.log('Token info:', {
                token: tokenInfo[0],
                owner: tokenInfo[1],
                isListed: tokenInfo[2],
                dexName: tokenInfo[3],
                creationTime: tokenInfo[4].toString(),
                listingTime: tokenInfo[5].toString()
            });
            
            // Check if token is listed
            const isListed = await factory.isListed(tokenAddress);
            console.log('Is listed:', isListed);
            
        } catch (error) {
            console.error('Error checking token:', error);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 