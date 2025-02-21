require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
    console.log('\n=== Starting DEX Configuration ===\n');
    
    const [deployer] = await ethers.getSigners();
    console.log('Configuring with account:', deployer.address);
    
    const factoryAddress = "0xC1588c628615e4bBbA40De630ECa8Dd2DFCD2a9D";
    console.log('Factory address:', factoryAddress);
    
    // Get the contract factory
    const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_TwoStep");
    const factory = TokenFactory.attach(factoryAddress);
    
    // Router addresses for Sepolia
    const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    
    try {
        // Check ownership
        const owner = await factory.owner();
        console.log('Contract owner:', owner);
        console.log('Deployer address:', deployer.address);
        
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            throw new Error('Deployer is not the contract owner');
        }
        
        // Check if DEX is already configured
        console.log('\nChecking current DEX configuration...');
        let dexInfo;
        try {
            dexInfo = await factory.getDEXRouter("uniswap-test");
            console.log('Current DEX config:', dexInfo);
        } catch (error) {
            console.log('No existing DEX configuration found');
        }
        
        // Try to verify router interface first
        console.log('\nVerifying router interface...');
        const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);
        const factory_address = await router.factory();
        const weth_address = await router.WETH();
        console.log('Router factory:', factory_address);
        console.log('Router WETH:', weth_address);
        
        // Add DEX with debug mode
        console.log('\nSending addDEX transaction...');
        const tx = await factory.addDEX(
            "uniswap-test",
            UNISWAP_ROUTER,
            {
                gasLimit: 1000000,
                maxFeePerGas: ethers.parseUnits("50", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
            }
        );
        
        console.log('Transaction hash:', tx.hash);
        console.log('Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('Transaction receipt:', receipt);
        
        if (receipt.status === 1) {
            console.log('✅ Transaction successful!');
            
            // Verify final configuration
            console.log('\nVerifying final configuration...');
            const finalDexInfo = await factory.getDEXRouter("uniswap-test");
            console.log('Final DEX Configuration:', {
                name: "uniswap-test",
                router: finalDexInfo.router,
                isActive: finalDexInfo.isActive
            });
            
            // Get supported DEXes
            const supportedDEXes = await factory.getSupportedDEXes();
            console.log('\nSupported DEXes:', supportedDEXes);
        } else {
            console.log('❌ Transaction failed');
            throw new Error('Transaction failed');
        }
        
    } catch (error) {
        console.error('\n❌ Error during configuration:', error);
        if (error.transaction) {
            console.log('\nTransaction details:', {
                from: error.transaction.from,
                to: error.transaction.to,
                data: error.transaction.data,
                gasLimit: error.transaction.gasLimit?.toString()
            });
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 