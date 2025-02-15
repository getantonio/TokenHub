const { ethers } = require('hardhat');
const hre = require('hardhat');
require('@nomicfoundation/hardhat-ethers');

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with account:", deployer.address);
        console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
        console.log("Nonce:", await deployer.getNonce());

        // Deploy TokenTemplate_v2 first
        console.log("\nDeploying TokenTemplate_v2...");
        const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v2");
        const tokenTemplate = await TokenTemplate.deploy({
            gasLimit: 5000000,
            maxFeePerGas: ethers.parseUnits("10", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
        });

        await tokenTemplate.waitForDeployment();
        const tokenTemplateAddress = await tokenTemplate.getAddress();
        console.log("TokenTemplate_v2 deployed to:", tokenTemplateAddress);

        // Deploy TokenFactory_v2
        console.log("\nDeploying TokenFactory_v2...");
        const TokenFactory = await ethers.getContractFactory("TokenFactory_v2");
        const tokenFactory = await TokenFactory.deploy(tokenTemplateAddress, {
            gasLimit: 5000000,
            maxFeePerGas: ethers.parseUnits("10", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
        });

        await tokenFactory.waitForDeployment();
        const factoryAddress = await tokenFactory.getAddress();
        console.log("TokenFactory_v2 deployed to:", factoryAddress);

        // Initialize the factory with deployment fee
        console.log("\nInitializing factory...");
        const initTx = await tokenFactory.initialize(ethers.parseEther("0.001"), {
            gasLimit: 2000000,
            maxFeePerGas: ethers.parseUnits("10", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
        });
        await initTx.wait();
        console.log("Factory initialized with 0.001 ETH deployment fee");

        // Configure platform fee (0%)
        console.log("\nConfiguring platform fee...");
        const platformFeeTx = await tokenFactory.setPlatformFeePercentage(0, {
            gasLimit: 1000000,
            maxFeePerGas: ethers.parseUnits("10", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
        });
        await platformFeeTx.wait();
        console.log("Platform fee percentage configured (0%)");

        // Set platform fee recipient
        const recipientTx = await tokenFactory.setPlatformFeeRecipient(deployer.address, {
            gasLimit: 1000000,
            maxFeePerGas: ethers.parseUnits("10", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
        });
        await recipientTx.wait();
        console.log("Platform fee recipient configured");

        // Configure vesting (disabled since platform fee is 0%)
        console.log("\nConfiguring platform fee vesting...");
        const vestingTx = await tokenFactory.configurePlatformFeeVesting(
            7 * 24 * 60 * 60, // 7 days vesting duration
            24 * 60 * 60,     // 1 day cliff
            false,            // Disable vesting since platform fee is 0%
            {
                gasLimit: 1000000,
                maxFeePerGas: ethers.parseUnits("10", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
            }
        );
        await vestingTx.wait();
        console.log("Platform fee vesting configured (disabled)");

        // Verify the deployment
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("TokenTemplate Address:", tokenTemplateAddress);
        console.log("Factory Address:", factoryAddress);
        console.log("Network:", (await ethers.provider.getNetwork()).name);
        console.log("Block Number:", await ethers.provider.getBlockNumber());

        // Verify contracts on Etherscan
        if (process.env.ETHERSCAN_API_KEY) {
            console.log("\nVerifying contracts on Etherscan...");
            try {
                await hre.run("verify:verify", {
                    address: tokenTemplateAddress,
                    contract: "contracts/TokenTemplate_v2.sol:TokenTemplate_v2"
                });
                console.log("TokenTemplate_v2 verified");

                await hre.run("verify:verify", {
                    address: factoryAddress,
                    contract: "contracts/TokenFactory_v2.sol:TokenFactory_v2",
                    constructorArguments: [tokenTemplateAddress]
                });
                console.log("TokenFactory_v2 verified");
            } catch (error) {
                console.error("Error verifying contracts:", error);
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