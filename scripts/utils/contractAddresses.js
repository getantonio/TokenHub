const { ethers } = require("hardhat");

async function getContractAddresses() {
    // Get the network
    const network = await ethers.provider.getNetwork();
    console.log("Network info:", network);
    
    // Normalize network name
    let networkName = network.name.toLowerCase();
    if (networkName === "homestead") networkName = "mainnet";
    
    // Define contract addresses based on network
    const addresses = {
        sepolia: {
            factory: "0x5bB61aD9B5d57FCC4270318c9aBE7Bcd9b8604fB",
            token: "0xEd62e493a6Ee88916b0eFE2c4dD2Cc8119b9e883",
            router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router
            staking: "0x...", // Add your staking contract address
            rewards: "0x...", // Add your rewards contract address
            treasury: "0x...", // Add your treasury contract address
            pair: "0x...", // Add your pair contract address
            liquidity: "0x..." // Add your liquidity contract address
        },
        opsepolia: {
            factory: "0x5Bb4F98ACD08eA28001a7e18d434993F5b69076E",
            token: "0x...", // Add your token contract address
            router: "0x...", // Add your router contract address
            staking: "0x...",
            rewards: "0x...",
            treasury: "0x...",
            pair: "0x...",
            liquidity: "0x..."
        },
        arbitrumsepolia: {
            factory: "0xCBa48f15BecdAC1eAF709Ce65c8FEFe436513e07",
            token: "0x...",
            router: "0x...",
            staking: "0x...",
            rewards: "0x...",
            treasury: "0x...",
            pair: "0x...",
            liquidity: "0x..."
        },
        polygonamoy: {
            factory: "0xc9dE01F826649bbB1A54d2A00Ce91D046791AdE1",
            token: "0x...",
            router: "0x...",
            staking: "0x...",
            rewards: "0x...",
            treasury: "0x...",
            pair: "0x...",
            liquidity: "0x..."
        },
        bsctestnet: {
            factory: "0x...",
            token: "0x...",
            router: "0x...",
            staking: "0x...",
            rewards: "0x...",
            treasury: "0x...",
            pair: "0x...",
            liquidity: "0x..."
        }
    };

    // Check for addresses by chainId as fallback
    const chainIdMapping = {
        11155111: addresses.sepolia,
        11155420: addresses.opsepolia,
        421614: addresses.arbitrumsepolia,
        80002: addresses.polygonamoy,
        97: addresses.bsctestnet
    };

    // Return addresses for the current network
    const result = addresses[networkName] || chainIdMapping[network.chainId] || addresses.sepolia;
    console.log("Using addresses for network:", networkName);
    console.log("Addresses:", result);
    return result;
}

module.exports = {
    getContractAddresses
}; 