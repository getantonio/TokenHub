const hre = require("hardhat");
const { ethers } = hre;

async function requestRefund(factory: any, tokenAddress: string) {
    try {
        console.log(`\nProcessing refund for token: ${tokenAddress}`);
        console.log('\nChecking token info...');
        const tokenInfo = await factory.getTokenInfo(tokenAddress);
        console.log('Token info:', tokenInfo);
        
        console.log('\nInitiating emergency refund...');
        const tx = await factory.emergencyRefund(tokenAddress, {
            gasLimit: 200000,
            maxFeePerGas: ethers.parseUnits("50", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
        });
        
        console.log('Transaction hash:', tx.hash);
        console.log('Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log('✅ Refund successful!');
        } else {
            console.log('❌ Refund failed');
            throw new Error('Refund transaction failed');
        }
    } catch (error) {
        console.error('\n❌ Error during refund:', error);
        if (error.transaction) {
            console.log('\nTransaction details:', {
                from: error.transaction.from,
                to: error.transaction.to,
                data: error.transaction.data,
                gasLimit: error.transaction.gasLimit?.toString()
            });
        }
    }
}

async function main() {
    console.log('\n=== Starting Emergency Refund Process ===\n');
    
    const [deployer] = await ethers.getSigners();
    console.log('Account:', deployer.address);
    
    const factoryAddress = "0xC1588c628615e4bBbA40De630ECa8Dd2DFCD2a9D";
    console.log('Factory address:', factoryAddress);
    
    // Get the contract factory
    const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_TwoStep");
    const factory = TokenFactory.attach(factoryAddress);
    
    // Token addresses to process
    const tokenAddresses = [
        "0x2a9eb71954340aC02460d0C2bf22831b3c6F4E59",
        "0x44CA548504505CA3258ddf412834C611BE30574f"
    ];
    
    // Process each token
    for (const tokenAddress of tokenAddresses) {
        await requestRefund(factory, tokenAddress);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 