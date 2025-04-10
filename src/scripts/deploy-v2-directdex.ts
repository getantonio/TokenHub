import { ethers } from 'hardhat';
import '@nomicfoundation/hardhat-ethers';
import { TokenFactory_v2_DirectDEX_Fixed } from '../../typechain-types';

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with account:", deployer.address);
        console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
        console.log("Nonce:", await deployer.getNonce());

        // Deploy TokenFactory_v2_DirectDEX_Fixed first
        console.log("\nDeploying TokenFactory_v2_DirectDEX_Fixed...");
        const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX_Fixed");
        const tokenFactory = (await TokenFactory.deploy(
            ethers.parseEther("0.01")  // 0.01 ETH listing fee
        )) as TokenFactory_v2_DirectDEX_Fixed;

        await tokenFactory.waitForDeployment();
        const factoryAddress = await tokenFactory.getAddress();
        console.log("TokenFactory_v2_DirectDEX_Fixed deployed to:", factoryAddress);

        // Deploy TokenTemplate_v2DirectDEX
        console.log("\nDeploying TokenTemplate_v2DirectDEX...");
        const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v2DirectDEX");
        const tokenTemplate = await TokenTemplate.deploy(
            "Test Token",                                    // name
            "TEST",                                         // symbol
            ethers.parseEther("1000000"),                  // totalSupply (1M tokens)
            ethers.parseEther("10000"),                    // maxTxAmount (1% of total)
            ethers.parseEther("20000"),                    // maxWalletAmount (2% of total)
            false,                                         // enableTrading (false initially)
            Math.floor(Date.now() / 1000) + 3600,         // tradingStartTime (1 hour from now)
            "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router
            5,                                             // marketingFeePercentage (5%)
            3,                                             // developmentFeePercentage (3%)
            2,                                             // autoLiquidityFeePercentage (2%)
            deployer.address,                              // marketingWallet
            deployer.address,                              // developmentWallet
            factoryAddress,                                 // autoLiquidityWallet (factory contract)
            true,                                          // enableBuyFees
            true                                           // enableSellFees
        );

        await tokenTemplate.waitForDeployment();
        const tokenTemplateAddress = await tokenTemplate.getAddress();
        console.log("TokenTemplate_v2DirectDEX deployed to:", tokenTemplateAddress);

        // The TokenFactory_v2_DirectDEX_Fixed contract doesn't have an addDEX method
        // It uses the defaultRouter set in the constructor instead

        // Verify the deployment
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("TokenTemplate Address:", tokenTemplateAddress);
        console.log("Factory Address:", factoryAddress);
        console.log("Network:", (await ethers.provider.getNetwork()).name);
        console.log("Block Number:", await ethers.provider.getBlockNumber());

    } catch (error) {
        console.error("\nDeployment failed!");
        console.error("Error details:", error);
        process.exit(1);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 