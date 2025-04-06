const { ethers } = require("hardhat");
const { getContractAddresses } = require("./utils/contractAddresses");

// Factory ABI - only the functions we need
const FACTORY_ABI = [
    "function owner() view returns (address)"
];

async function main() {
    try {
        const network = await ethers.provider.getNetwork();
        console.log(`\nChecking ownership on network: ${network.name} (${network.chainId})`);
        
        const addresses = await getContractAddresses();
        const contracts = {
            factory: await ethers.getContractAt("TokenFactory", addresses.factory),
            token: await ethers.getContractAt("Token", addresses.token)
        };

        const [deployer] = await ethers.getSigners();
        console.log(`\nChecking ownership for deployer: ${deployer.address}`);

        // Check ownership for each contract
        for (const [name, contract] of Object.entries(contracts)) {
            try {
                const owner = await contract.owner();
                const isOwner = owner.toLowerCase() === deployer.address.toLowerCase();
                console.log(`\n${name.toUpperCase()} Contract:`);
                console.log(`Address: ${contract.address}`);
                console.log(`Owner: ${owner}`);
                console.log(`Status: ${isOwner ? '✅ Owned by deployer' : '❌ Not owned by deployer'}`);
                
                // Additional checks for specific contracts
                if (name === 'factory') {
                    try {
                        const feeCollector = await contract.feeCollector();
                        console.log(`Fee Collector: ${feeCollector}`);
                    } catch (error) {
                        console.log("Fee Collector: Not available");
                    }
                }
                
                if (name === 'token') {
                    try {
                        const factory = await contract.factory();
                        console.log(`Factory: ${factory}`);
                    } catch (error) {
                        console.log("Factory: Not available");
                    }
                }
            } catch (error) {
                console.error(`Error checking ${name} contract:`, error.message);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 