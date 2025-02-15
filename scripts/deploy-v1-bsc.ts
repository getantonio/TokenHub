const { ethers } = require('hardhat');
const hre = require('hardhat');
require('@nomicfoundation/hardhat-ethers');

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with account:", deployer.address);
        console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
        console.log("Nonce:", await deployer.getNonce());

        // Deploy TokenTemplate_v1 first
        console.log("\nDeploying TokenTemplate_v1...");
        const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1");
        const tokenTemplate = await TokenTemplate.deploy();

        await tokenTemplate.waitForDeployment();
        const tokenTemplateAddress = await tokenTemplate.getAddress();
        console.log("TokenTemplate_v1 deployed to:", tokenTemplateAddress);

        // Deploy TokenFactory_v1
        console.log("\nDeploying TokenFactory_v1...");
        const TokenFactory = await ethers.getContractFactory("TokenFactory_v1");
        const tokenFactory = await TokenFactory.deploy(
            ethers.parseEther("0.01"),  // 0.01 BNB listing fee
            tokenTemplateAddress         // Template address
        );

        await tokenFactory.waitForDeployment();
        const factoryAddress = await tokenFactory.getAddress();
        console.log("TokenFactory_v1 deployed to:", factoryAddress);

        // Verify the deployment
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("TokenTemplate Address:", tokenTemplateAddress);
        console.log("Factory Address:", factoryAddress);
        console.log("Network:", (await ethers.provider.getNetwork()).name);
        console.log("Block Number:", await ethers.provider.getBlockNumber());

        // Verify contracts
        if (process.env.BSCSCAN_API_KEY) {
            console.log("\nVerifying contracts on BSCScan...");
            
            // Verify TokenTemplate
            await hre.run("verify:verify", {
                address: tokenTemplateAddress,
                contract: "contracts/TokenTemplate_v1.sol:TokenTemplate_v1"
            });
            
            // Verify TokenFactory
            await hre.run("verify:verify", {
                address: factoryAddress,
                contract: "contracts/TokenFactory_v1.sol:TokenFactory_v1",
                constructorArguments: [
                    ethers.parseEther("0.01"),
                    tokenTemplateAddress
                ]
            });
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