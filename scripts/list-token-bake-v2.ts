require('dotenv').config();
const { ethers } = require('ethers');
const TokenFactoryV2BakeV2ABI = require('../src/contracts/abi/TokenFactory_v2_Bake_v2.json');

interface TransactionError extends Error {
    reason?: string;
    error?: {
        data?: {
            message?: string;
        };
    };
    transaction?: {
        from: string;
        to: string;
        value?: bigint;
        data: string;
    };
}

async function main() {
    const TOKEN_ADDRESS = '0x6F73a8A91faA1520b5FC7580534c63D8b14A309E';
    const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS;
    const DEX_NAME = 'pancakeswap-test';
    
    // Listing parameters
    const INITIAL_LIQUIDITY = ethers.parseEther('0.1');     // 0.1 ETH
    const LISTING_PRICE = ethers.parseEther('0.0001');      // 0.0001 ETH per token
    const LIQUIDITY_PERCENTAGE = 20;                         // 20% of total supply for liquidity
    
    if (!process.env.INFURA_PROJECT_ID) {
        throw new Error('INFURA_PROJECT_ID not set in .env file');
    }

    const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);
    
    console.log('Using account:', wallet.address);
    console.log('Token address:', TOKEN_ADDRESS);
    console.log('Factory address:', FACTORY_ADDRESS);
    
    // Create contract instances
    const factory = new ethers.Contract(
        FACTORY_ADDRESS || '',
        TokenFactoryV2BakeV2ABI.abi,
        wallet
    );
    
    const token = new ethers.Contract(
        TOKEN_ADDRESS,
        [
            'function totalSupply() view returns (uint256)',
            'function allowance(address,address) view returns (uint256)',
            'function approve(address,uint256) returns (bool)',
            'function owner() view returns (address)',
            'function balanceOf(address) view returns (uint256)'
        ],
        wallet
    );

    try {
        // Verify token ownership
        const tokenOwner = await token.owner();
        if (tokenOwner.toLowerCase() !== wallet.address.toLowerCase()) {
            throw new Error(`Not token owner. Owner is ${tokenOwner}, caller is ${wallet.address}`);
        }

        // Get listing fee
        const listingFee = await factory.getListingFee();
        console.log('\nListing fee:', ethers.formatEther(listingFee), 'ETH');
        
        // Calculate total value needed
        const totalValue = INITIAL_LIQUIDITY + listingFee;
        console.log('Total ETH needed:', ethers.formatEther(totalValue), 'ETH');

        // Check ETH balance
        const ethBalance = await provider.getBalance(wallet.address);
        if (ethBalance < totalValue) {
            throw new Error(`Insufficient ETH balance. Need ${ethers.formatEther(totalValue)} ETH but have ${ethers.formatEther(ethBalance)} ETH`);
        }
        
        // Check if DEX is active
        const dexInfo = await factory.getDEXRouter(DEX_NAME);
        console.log('\nDEX Info:', {
            name: DEX_NAME,
            router: dexInfo.router,
            isActive: dexInfo.isActive
        });
        
        if (!dexInfo.isActive) {
            throw new Error(`DEX ${DEX_NAME} is not active`);
        }

        // Check if token is already listed
        const isListed = await factory.isListed(TOKEN_ADDRESS);
        if (isListed) {
            throw new Error('Token is already listed');
        }
        
        // Calculate tokens needed for liquidity
        const totalSupply = await token.totalSupply();
        const tokensForLiquidity = (totalSupply * BigInt(LIQUIDITY_PERCENTAGE)) / BigInt(100);
        
        // Check token balance
        const tokenBalance = await token.balanceOf(wallet.address);
        if (tokenBalance < tokensForLiquidity) {
            throw new Error(`Insufficient token balance. Need ${ethers.formatEther(tokensForLiquidity)} tokens but have ${ethers.formatEther(tokenBalance)} tokens`);
        }
        
        // Check and update allowance if needed
        const currentAllowance = await token.allowance(wallet.address, FACTORY_ADDRESS);
        if (currentAllowance < tokensForLiquidity) {
            console.log('\nApproving tokens for factory...');
            const approveTx = await token.approve(FACTORY_ADDRESS, tokensForLiquidity);
            console.log('Approval tx:', approveTx.hash);
            await approveTx.wait();
            console.log('Approval confirmed');
        } else {
            console.log('\nToken allowance is sufficient');
        }

        // List token
        console.log('\nListing token...');
        console.log('Parameters:', {
            token: TOKEN_ADDRESS,
            initialLiquidity: ethers.formatEther(INITIAL_LIQUIDITY),
            listingPrice: ethers.formatEther(LISTING_PRICE),
            dexName: DEX_NAME,
            totalValue: ethers.formatEther(totalValue),
            tokensForLiquidity: ethers.formatEther(tokensForLiquidity),
            liquidityPercentage: LIQUIDITY_PERCENTAGE
        });

        // First estimate gas
        console.log('\nEstimating gas...');
        const gasEstimate = await factory.listTokenOnDEX.estimateGas(
            TOKEN_ADDRESS,
            INITIAL_LIQUIDITY,
            LISTING_PRICE,
            DEX_NAME,
            LIQUIDITY_PERCENTAGE,
            {
                value: totalValue
            }
        );
        
        console.log('Estimated gas:', gasEstimate.toString());

        console.log('\nSending transaction...');
        const tx = await factory.listTokenOnDEX(
            TOKEN_ADDRESS,
            INITIAL_LIQUIDITY,
            LISTING_PRICE,
            DEX_NAME,
            LIQUIDITY_PERCENTAGE,
            {
                value: totalValue,
                gasLimit: Math.floor(Number(gasEstimate) * 1.2) // Add 20% buffer
            }
        );

        console.log('Transaction hash:', tx.hash);
        console.log('Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        
        // Check if listing was successful by looking at the events
        const listingEvent = receipt.logs.find((log: { topics: string[], data: string }) => {
            try {
                const parsedLog = factory.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                });
                return parsedLog.name === 'TokenListed';
            } catch {
                return false;
            }
        });

        if (!listingEvent) {
            throw new Error('Listing event not found in transaction logs');
        }
        
        // Verify listing
        const finalIsListed = await factory.isListed(TOKEN_ADDRESS);
        console.log('\nToken listed successfully:', finalIsListed);
        
        const tokenInfo = await factory.getTokenInfo(TOKEN_ADDRESS);
        console.log('Final token info:', {
            isListed: tokenInfo.isListed,
            dexName: tokenInfo.dexName,
            listingTime: new Date(Number(tokenInfo.listingTime) * 1000).toLocaleString(),
            liquidityPercentage: tokenInfo.liquidityPercentage.toString()
        });
        
    } catch (error) {
        const txError = error as TransactionError;
        console.error('Error:', txError.message || txError);
        if (txError.reason) console.error('Reason:', txError.reason);
        if (txError.error?.data?.message) console.error('Error data:', txError.error.data.message);
        if (txError.transaction) {
            console.error('Transaction:', {
                from: txError.transaction.from,
                to: txError.transaction.to,
                value: txError.transaction.value?.toString(),
                data: txError.transaction.data
            });
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }); 