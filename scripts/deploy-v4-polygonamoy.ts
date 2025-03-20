const hre = require("hardhat");
const ethers = hre.ethers;

async function deployImplementations() {
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log("Starting V4 implementations deployment on Polygon Amoy...");
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    console.log("Nonce:", await deployer.getNonce());

    // Deploy token implementation
    console.log("\nDeploying token implementation...");
    const V4TokenBase = await ethers.getContractFactory("contracts/V4TokenBase.sol:V4TokenBase");
    const tokenImpl = await V4TokenBase.deploy({
        gasLimit: 3000000,
        maxFeePerGas: ethers.parseUnits("50", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")
    });
    await tokenImpl.waitForDeployment();
    console.log("Token Implementation:", await tokenImpl.getAddress());

    // Get updated balance
    const balanceAfterToken = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balanceAfterToken), "ETH");
    console.log("Cost:", ethers.formatEther(balance - balanceAfterToken), "ETH");

    // Deploy security module implementation
    console.log("\nDeploying security module implementation...");
    const V4SecurityModule = await ethers.getContractFactory("contracts/V4SecurityModule.sol:V4SecurityModule");
    const securityModuleImpl = await V4SecurityModule.deploy({
        gasLimit: 3000000,
        maxFeePerGas: ethers.parseUnits("50", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")
    });
    await securityModuleImpl.waitForDeployment();
    console.log("Security Module Implementation:", await securityModuleImpl.getAddress());

    // Get updated balance
    const balanceAfterSecurity = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balanceAfterSecurity), "ETH");
    console.log("Cost:", ethers.formatEther(balanceAfterToken - balanceAfterSecurity), "ETH");

    // Deploy distribution module implementation
    console.log("\nDeploying distribution module implementation...");
    const V4DistributionModule = await ethers.getContractFactory("contracts/V4DistributionModule.sol:V4DistributionModule");
    const distributionModuleImpl = await V4DistributionModule.deploy({
        gasLimit: 3000000,
        maxFeePerGas: ethers.parseUnits("50", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")
    });
    await distributionModuleImpl.waitForDeployment();
    console.log("Distribution Module Implementation:", await distributionModuleImpl.getAddress());

    // Get updated balance
    const balanceAfterDistribution = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balanceAfterDistribution), "ETH");
    console.log("Cost:", ethers.formatEther(balanceAfterSecurity - balanceAfterDistribution), "ETH");

    // Print total cost
    console.log("\nTotal cost:", ethers.formatEther(balance - balanceAfterDistribution), "ETH");

    // Return implementation addresses
    return {
        tokenImpl: await tokenImpl.getAddress(),
        securityModuleImpl: await securityModuleImpl.getAddress(),
        distributionModuleImpl: await distributionModuleImpl.getAddress()
    };
}

async function deployFactory(implementations) {
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log("\nStarting V4Factory deployment on Polygon Amoy...");
    console.log("Deploying contract with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    console.log("Nonce:", await deployer.getNonce());

    // Deploy factory
    console.log("\nDeploying V4Factory...");
    const V4Factory = await ethers.getContractFactory("contracts/V4Factory.sol:V4Factory");
    const factory = await V4Factory.deploy(
        deployer.address,
        implementations.tokenImpl,
        implementations.securityModuleImpl,
        implementations.distributionModuleImpl,
        {
            gasLimit: 5000000,
            maxFeePerGas: ethers.parseUnits("50", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")
        }
    );
    await factory.waitForDeployment();
    console.log("V4Factory deployed to:", await factory.getAddress());

    // Get updated balance
    const balanceAfterFactory = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balanceAfterFactory), "ETH");
    console.log("Cost:", ethers.formatEther(balance - balanceAfterFactory), "ETH");

    // Get beacon addresses
    const tokenBeacon = await factory.tokenBeacon();
    const securityModuleBeacon = await factory.securityModuleBeacon();
    const distributionModuleBeacon = await factory.distributionModuleBeacon();

    console.log("\nImplementation Addresses:");
    console.log("Token Implementation:", implementations.tokenImpl);
    console.log("Security Module Implementation:", implementations.securityModuleImpl);
    console.log("Distribution Module Implementation:", implementations.distributionModuleImpl);

    console.log("\nBeacon Addresses:");
    console.log("Token Beacon:", tokenBeacon);
    console.log("Security Module Beacon:", securityModuleBeacon);
    console.log("Distribution Module Beacon:", distributionModuleBeacon);

    console.log("\nVerification Commands:");
    console.log(`npx hardhat verify --network polygonamoy ${await factory.getAddress()} ${deployer.address} ${implementations.tokenImpl} ${implementations.securityModuleImpl} ${implementations.distributionModuleImpl}`);
    console.log(`npx hardhat verify --network polygonamoy ${implementations.tokenImpl}`);
    console.log(`npx hardhat verify --network polygonamoy ${implementations.securityModuleImpl}`);
    console.log(`npx hardhat verify --network polygonamoy ${implementations.distributionModuleImpl}`);

    console.log("\nEnvironment Variable:");
    console.log(`NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4=${await factory.getAddress()}`);
}

async function deploy() {
    try {
        // Make sure we're on Polygon Amoy
        const network = await ethers.provider.getNetwork();
        if (network.chainId !== 80002n) {
            throw new Error(`This script is intended for Polygon Amoy (chainId: 80002), but connected to chainId: ${network.chainId}`);
        }
        
        const implementations = await deployImplementations();
        await deployFactory(implementations);
    } catch (error) {
        console.error("\nError:", error);
        process.exit(1);
    }
}

// Execute the script
if (require.main === module) {
    deploy()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { deploy, deployImplementations, deployFactory }; 