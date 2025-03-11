const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Estimating gas with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    
    // Get current gas price
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log("\nCurrent gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    
    // Estimate TestFactory deployment
    const TestFactory = await ethers.getContractFactory("TestFactory");
    const factoryTx = await TestFactory.getDeployTransaction();
    const factoryGas = await ethers.provider.estimateGas({
        from: deployer.address,
        data: factoryTx.data
    });
    console.log("\nTest Factory:");
    console.log("Gas:", factoryGas.toString());
    console.log("Cost:", ethers.formatEther(factoryGas * gasPrice), "ETH");
    
    // Estimate TestToken deployment
    const TestToken = await ethers.getContractFactory("TestToken");
    const tokenTx = await TestToken.getDeployTransaction(
        "Test",
        "TEST",
        ethers.parseEther("1000000")
    );
    const tokenGas = await ethers.provider.estimateGas({
        from: deployer.address,
        data: tokenTx.data
    });
    console.log("\nTest Token:");
    console.log("Gas:", tokenGas.toString());
    console.log("Cost:", ethers.formatEther(tokenGas * gasPrice), "ETH");
    
    // Total cost
    const totalGas = factoryGas + tokenGas;
    console.log("\nTotal Gas:", totalGas.toString());
    console.log("Total Cost:", ethers.formatEther(totalGas * gasPrice), "ETH");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 