const hre = require("hardhat");

async function main() {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    console.log(`Adding DEX on ${network.name}...`);
    console.log("Using account:", deployer.address);

    const factoryAddress = "0xc300648556860006771f1f982d3dDE65A54C1BA0";
    const factory = await ethers.getContractAt("TokenFactory_v2_DirectDEX_TwoStep", factoryAddress);

    // Updated Uniswap V2 Router address for Sepolia
    const UNISWAP_ROUTER = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";

    // First verify the router interface
    console.log('\nVerifying router interface...');
    const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_ROUTER);
    
    console.log('Checking router factory...');
    const uniswapFactory = await router.factory();
    console.log('Router factory address:', uniswapFactory);

    console.log('Checking router WETH...');
    const weth = await router.WETH();
    console.log('Router WETH address:', weth);

    // Now add the DEX
    console.log('\nAdding Uniswap V2 as supported DEX...');
    const tx = await factory.addDEX(
        "uniswap-v2",
        UNISWAP_ROUTER,
        {
            gasLimit: 1000000
        }
    );
    
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    // Verify the DEX was added
    const dexInfo = await factory.getDEXRouter("uniswap-v2");
    console.log('DEX Configuration:', {
        name: "uniswap-v2",
        router: dexInfo.router,
        isActive: dexInfo.isActive
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 