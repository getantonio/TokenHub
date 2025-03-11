const runtime = require("hardhat");
const ethersRuntime = runtime.ethers;

async function estimateGas() {
    // Get signer
    const [deployer] = await ethersRuntime.getSigners();
    console.log("Estimating gas with account:", deployer.address);
    
    const balance = await ethersRuntime.provider.getBalance(deployer.address);
    console.log("Account balance:", ethersRuntime.formatEther(balance), "ETH");

    // Get fee data for calculations
    const feeData = await ethersRuntime.provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log("\nCurrent gas price:", ethersRuntime.formatUnits(gasPrice, "gwei"), "gwei");

    // Estimate Token Implementation
    const V4TokenBase = await ethersRuntime.getContractFactory("V4TokenBase");
    const tokenDeployTx = await V4TokenBase.getDeployTransaction();
    const tokenGas = await ethersRuntime.provider.estimateGas({
        from: deployer.address,
        data: tokenDeployTx.data
    });
    console.log("\nToken Implementation:");
    console.log("Gas:", tokenGas.toString());
    console.log("Cost:", ethersRuntime.formatEther(tokenGas * gasPrice), "ETH");

    // Estimate Security Module Implementation
    const V4SecurityModule = await ethersRuntime.getContractFactory("V4SecurityModule");
    const securityDeployTx = await V4SecurityModule.getDeployTransaction();
    const securityGas = await ethersRuntime.provider.estimateGas({
        from: deployer.address,
        data: securityDeployTx.data
    });
    console.log("\nSecurity Module Implementation:");
    console.log("Gas:", securityGas.toString());
    console.log("Cost:", ethersRuntime.formatEther(securityGas * gasPrice), "ETH");

    // Estimate Distribution Module Implementation
    const V4DistributionModule = await ethersRuntime.getContractFactory("V4DistributionModule");
    const distributionDeployTx = await V4DistributionModule.getDeployTransaction();
    const distributionGas = await ethersRuntime.provider.estimateGas({
        from: deployer.address,
        data: distributionDeployTx.data
    });
    console.log("\nDistribution Module Implementation:");
    console.log("Gas:", distributionGas.toString());
    console.log("Cost:", ethersRuntime.formatEther(distributionGas * gasPrice), "ETH");

    // Total implementation cost
    const totalImplGas = tokenGas + securityGas + distributionGas;
    console.log("\nTotal Implementation Gas:", totalImplGas.toString());
    console.log("Total Implementation Cost:", ethersRuntime.formatEther(totalImplGas * gasPrice), "ETH");

    // Factory deployment (separate step)
    const V4Factory = await ethersRuntime.getContractFactory("V4Factory");
    const factoryDeployTx = await V4Factory.getDeployTransaction(
        deployer.address,
        "0x0000000000000000000000000000000000000001", // Dummy addresses for estimation
        "0x0000000000000000000000000000000000000002",
        "0x0000000000000000000000000000000000000003"
    );
    const factoryGas = await ethersRuntime.provider.estimateGas({
        from: deployer.address,
        data: factoryDeployTx.data
    });
    console.log("\nFactory Contract:");
    console.log("Gas:", factoryGas.toString());
    console.log("Cost:", ethersRuntime.formatEther(factoryGas * gasPrice), "ETH");

    // Grand total
    const grandTotalGas = totalImplGas + factoryGas;
    console.log("\nGrand Total Gas:", grandTotalGas.toString());
    console.log("Grand Total Cost:", ethersRuntime.formatEther(grandTotalGas * gasPrice), "ETH");
}

// Execute the script
if (require.main === module) {
    estimateGas()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { estimateGas }; 