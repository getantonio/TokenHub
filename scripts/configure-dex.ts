require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
    console.log('\n=== Starting DEX Configuration ===\n');
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log('Deployer account:', deployer.address);
    
    // Get contract instance
    const factoryAddress = process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS;
    console.log('Factory address:', factoryAddress);
    
    const TokenFactory = await ethers.getContractFactory('TokenFactory_v2_DirectDEX_TwoStep');
    const factory = TokenFactory.attach(factoryAddress);
    
    // Router addresses for Sepolia
    const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    
    try {
        // Check if DEX is already configured
        console.log('Checking current DEX configuration...');
        const currentDex = await factory.getDEXRouter("uniswap-test").catch(() => null);
        
        if (currentDex && currentDex.router !== '0x0000000000000000000000000000000000000000') {
            console.log('Updating existing DEX configuration...');
            const tx = await factory.updateDEX("uniswap-test", UNISWAP_ROUTER, true, {
                gasLimit: 200000
            });
            console.log('Update transaction:', tx.hash);
            await tx.wait();
            console.log('✅ DEX updated successfully');
        } else {
            console.log('Adding new DEX configuration...');
            const tx = await factory.addDEX("uniswap-test", UNISWAP_ROUTER, {
                gasLimit: 200000
            });
            console.log('Add transaction:', tx.hash);
            await tx.wait();
            console.log('✅ DEX added successfully');
        }
        
        // Verify configuration
        const dexInfo = await factory.getDEXRouter("uniswap-test");
        console.log('\nFinal DEX Configuration:');
        console.log('Name:', "uniswap-test");
        console.log('Router:', dexInfo.router);
        console.log('Active:', dexInfo.isActive);
        
    } catch (error) {
        console.error('\n❌ Error during configuration:', error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 