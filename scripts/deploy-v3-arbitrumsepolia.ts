const { ethers } = require('hardhat');
const hre = require('hardhat');

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with account:", deployer.address);
        console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
        console.log("Nonce:", await deployer.getNonce());

        // Deploy UniswapV2Factory first
        console.log("\nDeploying UniswapV2Factory...");
        const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
        const uniswapV2Factory = await UniswapV2Factory.deploy(deployer.address, {
            gasLimit: 5000000,
            maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei")
        });

        await uniswapV2Factory.waitForDeployment();
        const factoryAddress = await uniswapV2Factory.getAddress();
        console.log("UniswapV2Factory deployed to:", factoryAddress);

        // Deploy WETH
        console.log("\nDeploying WETH...");
        const WETH = await ethers.getContractFactory("WETH9");
        const weth = await WETH.deploy({
            gasLimit: 3000000,
            maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei")
        });

        await weth.waitForDeployment();
        const wethAddress = await weth.getAddress();
        console.log("WETH deployed to:", wethAddress);

        // Deploy UniswapV2Router02
        console.log("\nDeploying UniswapV2Router02...");
        const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02");
        const uniswapV2Router02 = await UniswapV2Router02.deploy(factoryAddress, wethAddress, {
            gasLimit: 5000000,
            maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei")
        });

        await uniswapV2Router02.waitForDeployment();
        const routerAddress = await uniswapV2Router02.getAddress();
        console.log("UniswapV2Router02 deployed to:", routerAddress);

        // Deploy TokenTemplate_v3 with the router address
        console.log("\nDeploying TokenTemplate_v3...");
        const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v3");
        const tokenTemplate = await TokenTemplate.deploy(routerAddress, {
            gasLimit: 5000000,
            maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei")
        });

        await tokenTemplate.waitForDeployment();
        const tokenTemplateAddress = await tokenTemplate.getAddress();
        console.log("TokenTemplate_v3 deployed to:", tokenTemplateAddress);

        // Deploy TokenFactory_v3 with the router address
        console.log("\nDeploying TokenFactory_v3...");
        const TokenFactory = await ethers.getContractFactory("TokenFactory_v3");
        const tokenFactory = await TokenFactory.deploy(routerAddress, {
            gasLimit: 5000000,
            maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei")
        });

        await tokenFactory.waitForDeployment();
        const tokenFactoryAddress = await tokenFactory.getAddress();
        console.log("TokenFactory_v3 deployed to:", tokenFactoryAddress);

        // Initialize the factory with deployment fee
        console.log("\nInitializing factory...");
        const initTx = await tokenFactory.setDeploymentFee(ethers.parseEther("0.001"), {
            gasLimit: 2000000,
            maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("0.1", "gwei")
        });
        await initTx.wait();
        console.log("Factory initialized with 0.001 ETH deployment fee");

        // Verify the deployment
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("UniswapV2Factory Address:", factoryAddress);
        console.log("WETH Address:", wethAddress);
        console.log("UniswapV2Router02 Address:", routerAddress);
        console.log("TokenTemplate_v3 Address:", tokenTemplateAddress);
        console.log("TokenFactory_v3 Address:", tokenFactoryAddress);
        console.log("Network:", (await ethers.provider.getNetwork()).name);
        console.log("Block Number:", await ethers.provider.getBlockNumber());

        // Verify contracts on Arbiscan
        if (process.env.ARBISCAN_API_KEY) {
            console.log("\nVerifying contracts on Arbiscan...");
            try {
                await hre.run("verify:verify", {
                    address: factoryAddress,
                    contract: "src/contracts/external/uniswap-v2-core/UniswapV2Factory.sol:UniswapV2Factory",
                    constructorArguments: [deployer.address]
                });
                console.log("UniswapV2Factory verified");

                await hre.run("verify:verify", {
                    address: wethAddress,
                    contract: "src/contracts/external/uniswap-v2-periphery/test/WETH9.sol:WETH9"
                });
                console.log("WETH verified");

                await hre.run("verify:verify", {
                    address: routerAddress,
                    contract: "src/contracts/external/uniswap-v2-periphery/UniswapV2Router02.sol:UniswapV2Router02",
                    constructorArguments: [factoryAddress, wethAddress]
                });
                console.log("UniswapV2Router02 verified");

                await hre.run("verify:verify", {
                    address: tokenTemplateAddress,
                    contract: "src/contracts/TokenTemplate_v3.sol:TokenTemplate_v3",
                    constructorArguments: [routerAddress]
                });
                console.log("TokenTemplate_v3 verified");

                await hre.run("verify:verify", {
                    address: tokenFactoryAddress,
                    contract: "src/contracts/TokenFactory_v3.sol:TokenFactory_v3",
                    constructorArguments: [routerAddress]
                });
                console.log("TokenFactory_v3 verified");
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
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 