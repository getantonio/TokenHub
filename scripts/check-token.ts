const { ethers } = require('ethers');
const dotenv = require('dotenv');

dotenv.config();

// Import ABIs
const TokenFactoryABI = require('../src/contracts/abi/TokenFactory_v2_Bake.json');

const TOKEN_ADDRESS = '0x6F73a8A91faA1520b5FC7580534c63D8b14A309E';
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_SEPOLIA_TOKEN_FACTORY_V2_BAKE_ADDRESS;

interface ContractError extends Error {
    code?: string;
}

async function main() {
    if (!process.env.INFURA_PROJECT_ID) {
        throw new Error('INFURA_PROJECT_ID not set in .env file');
    }

    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error('Private key not found');
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('Using account:', wallet.address);
    console.log('Token address:', TOKEN_ADDRESS);
    console.log('Factory address:', FACTORY_ADDRESS);
    console.log();

    // Initialize factory contract
    const factory = new ethers.Contract(FACTORY_ADDRESS!, TokenFactoryABI.abi, wallet);

    // Initialize token contract with minimal interface
    const token = new ethers.Contract(
        TOKEN_ADDRESS,
        [
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function totalSupply() view returns (uint256)',
            'function owner() view returns (address)',
            'function allowance(address,address) view returns (uint256)',
            'function balanceOf(address) view returns (uint256)'
        ],
        wallet
    );

    try {
        // Check if contract exists
        const code = await provider.getCode(TOKEN_ADDRESS);
        if (code === '0x') {
            throw new Error('No contract found at the specified token address');
        }

        // Check token details
        const [name, symbol, totalSupply, owner, balance] = await Promise.all([
            token.name(),
            token.symbol(),
            token.totalSupply(),
            token.owner(),
            token.balanceOf(wallet.address)
        ]);

        console.log('Token Details:');
        console.log('- Name:', name);
        console.log('- Symbol:', symbol);
        console.log('- Total Supply:', ethers.formatEther(totalSupply), 'tokens');
        console.log('- Owner:', owner);
        console.log('- Current account is owner:', owner.toLowerCase() === wallet.address.toLowerCase());
        console.log('- Your Balance:', ethers.formatEther(balance), 'tokens');
        console.log();

        // Check if token is listed
        const isListed = await factory.isListed(TOKEN_ADDRESS);
        console.log('Token is listed:', isListed);

        if (isListed) {
            const tokenInfo = await factory.getTokenInfo(TOKEN_ADDRESS);
            console.log('Token Info:');
            console.log('- DEX:', tokenInfo.dexName);
            console.log('- Listing Time:', new Date(Number(tokenInfo.listingTime) * 1000).toLocaleString());
        }
        console.log();

        // Check token allowance
        const allowance = await token.allowance(wallet.address, FACTORY_ADDRESS);
        console.log('Factory allowance:', ethers.formatEther(allowance), 'tokens');

        // Calculate required allowance (20% of total supply)
        const requiredAllowance = totalSupply * BigInt(20) / BigInt(100);
        console.log('Required allowance:', ethers.formatEther(requiredAllowance), 'tokens');
        console.log('Allowance is sufficient:', allowance >= requiredAllowance);
        console.log();

        // Check DEX configuration
        const supportedDEXes = await factory.getSupportedDEXes();
        console.log('Supported DEXes:', supportedDEXes);

        for (const dexName of supportedDEXes) {
            const dexInfo = await factory.getDEXRouter(dexName);
            console.log(`\nDEX Info (${dexName}):`);
            console.log('- Router:', dexInfo.router);
            console.log('- Active:', dexInfo.isActive);
        }

        // Get listing fee
        const listingFee = await factory.getListingFee();
        console.log('\nListing fee:', ethers.formatEther(listingFee), 'ETH');

    } catch (error) {
        console.error('Error:', error);
        
        // Additional error context
        const contractError = error as ContractError;
        if (contractError.code === 'CALL_EXCEPTION') {
            console.error('Contract call failed. This might be due to:');
            console.error('1. The contract not existing at the address');
            console.error('2. The function not existing in the contract');
            console.error('3. The call being invalid for the contract state');
        }
    }
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
}); 