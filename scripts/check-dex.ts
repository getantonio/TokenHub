const hre = require("hardhat");

async function main() {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    console.log(`Checking DEXes on ${network.name}...`);
    console.log("Using account:", deployer.address);

    const factoryAddress = "0xc300648556860006771f1f982d3dDE65A54C1BA0";
    const factory = await ethers.getContractAt("TokenFactory_v2_DirectDEX_TwoStep", factoryAddress);

    // Get supported DEXes
    console.log('\nGetting supported DEXes...');
    const supportedDEXes = await factory.getSupportedDEXes();
    console.log('Supported DEXes:', supportedDEXes);

    // Get details for each DEX
    console.log('\nDEX Details:');
    for (const dexName of supportedDEXes) {
        const dexInfo = await factory.getDEXRouter(dexName);
        console.log(`\n${dexName}:`, {
            router: dexInfo.router,
            isActive: dexInfo.isActive
        });

        // Verify router interface
        const router = await ethers.getContractAt("IUniswapV2Router02", dexInfo.router);
        const factory_address = await router.factory();
        const weth_address = await router.WETH();
        
        console.log('Router details:', {
            factory: factory_address,
            WETH: weth_address
        });
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 