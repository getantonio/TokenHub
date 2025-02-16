const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Deploying test factory with account:", deployer.address);
        console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

        // Deploy TokenFactoryTest
        const creationFee = ethers.parseEther("0.001"); // 0.001 ETH fee
        const TokenFactoryTest = await ethers.getContractFactory("TokenFactoryTest");
        const factory = await TokenFactoryTest.deploy(creationFee);
        await factory.waitForDeployment();

        const factoryAddress = await factory.getAddress();
        console.log("TokenFactoryTest deployed to:", factoryAddress);

        // Verify contract if on a network that supports it
        if (process.env.ETHERSCAN_API_KEY) {
            console.log("Verifying contract...");
            try {
                await hre.run("verify:verify", {
                    address: factoryAddress,
                    constructorArguments: [creationFee],
                });
                console.log("Contract verified successfully");
            } catch (error) {
                console.error("Error verifying contract:", error);
            }
        }

        // Log deployment info
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("Factory Address:", factoryAddress);
        console.log("Creation Fee:", ethers.formatEther(creationFee), "ETH");
        console.log("Network:", (await ethers.provider.getNetwork()).name);
        console.log("Block Number:", await ethers.provider.getBlockNumber());

        // Save deployment info
        const fs = require("fs");
        const deploymentInfo = {
            factoryAddress,
            creationFee: creationFee.toString(),
            network: (await ethers.provider.getNetwork()).name,
            blockNumber: await ethers.provider.getBlockNumber(),
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(
            "deployment-test-info.json",
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log("\nDeployment info saved to deployment-test-info.json");

    } catch (error) {
        console.error("\nDeployment failed!");
        console.error("Error details:", error);
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