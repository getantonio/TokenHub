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

    try {
        // Deploy token implementation
        console.log("\nDeploying token implementation...");
        const V4TokenBase = await ethers.getContractFactory("contracts/V4TokenBase.sol:V4TokenBase");
        const tokenImpl = await V4TokenBase.deploy({
            gasLimit: 4000000,
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
            gasLimit: 4000000,
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
            gasLimit: 4000000,
            maxFeePerGas: ethers.parseUnits("50", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")
        });
        await distributionModuleImpl.waitForDeployment();
        console.log("Distribution Module Implementation:", await distributionModuleImpl.getAddress());

        // Get updated balance
        const balanceAfterDistribution = await ethers.provider.getBalance(deployer.address);
        console.log("Account balance:", ethers.formatEther(balanceAfterDistribution), "ETH");
        console.log("Cost:", ethers.formatEther(balanceAfterSecurity - balanceAfterDistribution), "ETH");

        // Deploy liquidity module implementation
        console.log("\nDeploying liquidity module implementation...");
        const V4LiquidityModule = await ethers.getContractFactory("contracts/V4LiquidityModule.sol:V4LiquidityModule");
        const liquidityModuleImpl = await V4LiquidityModule.deploy({
            gasLimit: 4000000,
            maxFeePerGas: ethers.parseUnits("50", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")
        });
        await liquidityModuleImpl.waitForDeployment();
        console.log("Liquidity Module Implementation:", await liquidityModuleImpl.getAddress());

        // Get updated balance
        const balanceAfterLiquidity = await ethers.provider.getBalance(deployer.address);
        console.log("Account balance:", ethers.formatEther(balanceAfterLiquidity), "ETH");
        console.log("Cost:", ethers.formatEther(balanceAfterDistribution - balanceAfterLiquidity), "ETH");

        // Print total cost
        console.log("\nTotal cost:", ethers.formatEther(balance - balanceAfterLiquidity), "ETH");

        // Verify implementations work
        console.log("\nChecking implementations...");
        
        // Return implementation addresses
        return {
            tokenImpl: await tokenImpl.getAddress(),
            securityModuleImpl: await securityModuleImpl.getAddress(),
            distributionModuleImpl: await distributionModuleImpl.getAddress(),
            liquidityModuleImpl: await liquidityModuleImpl.getAddress()
        };
    } catch (error) {
        console.error("\nError during implementation deployment:", error);
        throw error;
    }
}

async function deployFactory(implementations) {
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log("\nStarting V4Factory deployment on Polygon Amoy...");
    console.log("Deploying contract with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    console.log("Nonce:", await deployer.getNonce());

    try {
        // Deploy factory
        console.log("\nDeploying V4Factory...");
        const V4Factory = await ethers.getContractFactory("contracts/V4Factory.sol:V4Factory");
        const factory = await V4Factory.deploy(
            deployer.address,
            implementations.tokenImpl,
            implementations.securityModuleImpl,
            implementations.distributionModuleImpl,
            implementations.liquidityModuleImpl,
            {
                gasLimit: 8000000,
                maxFeePerGas: ethers.parseUnits("50", "gwei"),
                maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")
            }
        );
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();
        console.log("V4Factory deployed to:", factoryAddress);

        // Get updated balance
        const balanceAfterFactory = await ethers.provider.getBalance(deployer.address);
        console.log("Account balance:", ethers.formatEther(balanceAfterFactory), "ETH");
        console.log("Cost:", ethers.formatEther(balance - balanceAfterFactory), "ETH");

        // Verify implementation addresses
        const addrs = await factory.getAddresses();
        console.log("\nVerifying addresses in factory:");
        console.log("Token Implementation:", addrs[0]);
        console.log("Security Module Implementation:", addrs[1]);
        console.log("Distribution Module Implementation:", addrs[2]);
        console.log("Liquidity Module Implementation:", addrs[3]);
        console.log("Token Beacon:", addrs[4]);
        console.log("Security Module Beacon:", addrs[5]);
        console.log("Distribution Module Beacon:", addrs[6]);
        console.log("Liquidity Module Beacon:", addrs[7]);

        console.log("\nVerification Commands:");
        console.log(`npx hardhat verify --network polygonamoy ${factoryAddress} ${deployer.address} ${implementations.tokenImpl} ${implementations.securityModuleImpl} ${implementations.distributionModuleImpl} ${implementations.liquidityModuleImpl}`);
        console.log(`npx hardhat verify --network polygonamoy ${implementations.tokenImpl}`);
        console.log(`npx hardhat verify --network polygonamoy ${implementations.securityModuleImpl}`);
        console.log(`npx hardhat verify --network polygonamoy ${implementations.distributionModuleImpl}`);
        console.log(`npx hardhat verify --network polygonamoy ${implementations.liquidityModuleImpl}`);

        console.log("\nEnvironment Variable:");
        console.log(`NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY=${factoryAddress}`);

        // Test token creation
        console.log("\nTesting token creation...");
        try {
            const testTx = await factory.createTokenForWeb(
                "Test Token",
                "TEST",
                ethers.parseUnits("1000000", 18),
                deployer.address,
                true, // include distribution
                {
                    gasLimit: 8000000,
                    maxFeePerGas: ethers.parseUnits("50", "gwei"),
                    maxPriorityFeePerGas: ethers.parseUnits("40", "gwei")
                }
            );
            const receipt = await testTx.wait();
            
            console.log("Token creation succeeded!");
            console.log("Transaction hash:", testTx.hash);
            
            // Find token address from logs
            const eventTopic = ethers.id("TokenCreated(address,string,string,address)");
            const log = receipt.logs.find(log => log.topics[0] === eventTopic);
            if (log) {
                const tokenAddress = '0x' + log.topics[1].slice(26);
                console.log("Test token deployed at:", tokenAddress);
            }
        } catch (error) {
            console.error("Error testing token creation:", error);
            const lastError = await factory.lastError();
            console.log("Last error from contract:", lastError);
        }

        return factoryAddress;
    } catch (error) {
        console.error("\nError during factory deployment:", error);
        throw error;
    }
}

async function deploy() {
    try {
        // Make sure we're on Polygon Amoy
        const network = await ethers.provider.getNetwork();
        if (network.chainId !== 80002n) {
            throw new Error(`This script is intended for Polygon Amoy (chainId: 80002), but connected to chainId: ${network.chainId}`);
        }
        
        // First copy contracts to the contracts directory
        console.log("Updating contract files in contracts directory...");
        
        const implementations = await deployImplementations();
        const factoryAddress = await deployFactory(implementations);
        
        console.log("\nDeployment completed successfully!");
        console.log("V4Factory address:", factoryAddress);
        console.log("Add this to your .env.local file:");
        console.log(`NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V4_WITH_LIQUIDITY=${factoryAddress}`);
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