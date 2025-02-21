const hre = require("hardhat");
const { ethers } = hre;

async function main() {
    console.log('\n=== Creating Token ===\n');
    
    const [deployer] = await ethers.getSigners();
    console.log('Account:', deployer.address);
    
    const factoryAddress = "0xC1588c628615e4bBbA40De630ECa8Dd2DFCD2a9D";
    console.log('Factory address:', factoryAddress);
    
    // Get the contract factory
    const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_TwoStep");
    const factory = TokenFactory.attach(factoryAddress);
    
    // Token creation parameters as a struct
    const params = {
        name: "STTOM Token",
        symbol: "STTOM",
        totalSupply: ethers.parseEther("1000000"), // 1 million tokens
        maxTxAmount: ethers.parseEther("10000"),
        maxWalletAmount: ethers.parseEther("20000"),
        enableTrading: false,
        tradingStartTime: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
        marketingFeePercentage: 2,
        marketingWallet: deployer.address,
        developmentFeePercentage: 1,
        developmentWallet: deployer.address,
        autoLiquidityFeePercentage: 2,
        enableBuyFees: true,
        enableSellFees: true
    };
    
    try {
        console.log('\nCreating token with parameters:', params);
        
        // Create token using struct
        const tx = await factory.createToken(params, {
            gasLimit: 5000000,
            maxFeePerGas: ethers.parseUnits("50", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
        });
        
        console.log('Transaction hash:', tx.hash);
        console.log('Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        // Get token address from event
        const event = receipt.logs
            .map(log => {
                try {
                    return factory.interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            })
            .find(event => event && event.name === "TokenCreated");
        
        if (event) {
            console.log('\n✅ Token created successfully!');
            console.log('Token address:', event.args.token);
            console.log('Owner:', event.args.owner);
            console.log('Name:', event.args.name);
            console.log('Symbol:', event.args.symbol);
            console.log('Total supply:', ethers.formatEther(event.args.totalSupply));
            console.log('Creation time:', new Date(Number(event.args.creationTime) * 1000).toLocaleString());
        }
        
    } catch (error) {
        console.error('\n❌ Error creating token:', error);
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