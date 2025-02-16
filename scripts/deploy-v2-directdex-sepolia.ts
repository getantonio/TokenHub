const { ethers } = require('hardhat');
const hre = require('hardhat');
require('@nomicfoundation/hardhat-ethers');

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with account:", deployer.address);
        console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
        console.log("Nonce:", await deployer.getNonce());

        // Get current gas price
        const feeData = await deployer.provider.getFeeData();
        console.log("\nCurrent gas prices:");
        console.log("maxFeePerGas:", ethers.formatUnits(feeData.maxFeePerGas || 0, "gwei"), "gwei");
        console.log("maxPriorityFeePerGas:", ethers.formatUnits(feeData.maxPriorityFeePerGas || 0, "gwei"), "gwei");

        // Calculate reasonable gas parameters
        const baseGasPrice = feeData.maxFeePerGas || ethers.parseUnits("3", "gwei");
        const priorityFee = feeData.maxPriorityFeePerGas || ethers.parseUnits("1.5", "gwei");
        const maxFeePerGas = baseGasPrice + priorityFee;

        // Deploy TokenFactory_v2_DirectDEX
        console.log("\nDeploying TokenFactory_v2_DirectDEX...");
        const TokenFactory = await ethers.getContractFactory("TokenFactory_v2_DirectDEX");
        const listingFee = ethers.parseEther("0.001"); // 0.001 ETH listing fee
        const tokenFactory = await TokenFactory.deploy(listingFee, {
            gasLimit: 5000000,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: priorityFee
        });

        await tokenFactory.waitForDeployment();
        const factoryAddress = await tokenFactory.getAddress();
        console.log("TokenFactory_v2_DirectDEX deployed to:", factoryAddress);

        // Add Uniswap V2 router for Sepolia
        const UNISWAP_V2_ROUTER_SEPOLIA = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
        console.log("\nAdding Uniswap V2 router...");
        const addDexTx = await tokenFactory.addDEX(
            "uniswap-test",
            UNISWAP_V2_ROUTER_SEPOLIA,
            {
                gasLimit: 200000,
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: priorityFee
            }
        );
        await addDexTx.wait();
        console.log("Uniswap V2 router added");

        // Verify the deployment
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("Factory Address:", factoryAddress);
        console.log("Network:", (await ethers.provider.getNetwork()).name);
        console.log("Block Number:", await ethers.provider.getBlockNumber());
        console.log("Listing Fee:", ethers.formatEther(listingFee), "ETH");
        console.log("Uniswap Router:", UNISWAP_V2_ROUTER_SEPOLIA);

        // Verify contract on Etherscan
        if (process.env.ETHERSCAN_API_KEY) {
            console.log("\nVerifying contract on Etherscan...");
            try {
                await hre.run("verify:verify", {
                    address: factoryAddress,
                    contract: "contracts/TokenFactory_v2_DirectDEX.sol:TokenFactory_v2_DirectDEX",
                    constructorArguments: [listingFee]
                });
                console.log("TokenFactory_v2_DirectDEX verified");
            } catch (error) {
                console.error("Error verifying contract:", error);
            }
        }

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