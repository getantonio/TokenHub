const { ethers } = require('hardhat');
require('@nomicfoundation/hardhat-ethers');

async function main() {
    try {
        // Contract addresses from .env.local
        const factoryV1Address = '0x14cA8710278F31803fDA2D6363d7Df8c2710b6aa';
        const factoryV2Address = '0x6a1205457ab3fef72b48A34A0DC9d22C48341cCc';

        // Get contract ABIs
        const TokenFactoryV1 = require('../src/contracts/abi/TokenFactory_v1.json');
        const TokenFactoryV2 = require('../src/contracts/abi/TokenFactory_v2.json');

        console.log('\nChecking contract owners...');
        console.log('--------------------');

        // Check V1 Factory
        console.log('\nFactory V1:');
        console.log('Address:', factoryV1Address);
        const factoryV1 = await ethers.getContractAt(TokenFactoryV1.abi, factoryV1Address);
        const ownerV1 = await factoryV1.owner();
        console.log('Owner:', ownerV1);

        // Check V2 Factory
        console.log('\nFactory V2:');
        console.log('Address:', factoryV2Address);
        const factoryV2 = await ethers.getContractAt(TokenFactoryV2.abi, factoryV2Address);
        const ownerV2 = await factoryV2.owner();
        console.log('Owner:', ownerV2);

        // Get deployer address for reference
        const [deployer] = await ethers.getSigners();
        console.log('\nCurrent wallet address:', deployer.address);

    } catch (error) {
        console.error('\nError checking owners:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 