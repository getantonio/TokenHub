const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const factoryAddress = "0xCe8414c145Fd77CdE67E0b07D33B3e4C5Ee9387e";
  const assetAddress = "0x91b0e3cd883c3c78f5d263d6a67f5ec86efe4414"; // PEPE token
  const poolName = "PEPE Lending Pool";
  const poolSymbol = "PEPE-LP";
  const collateralFactorBps = 7500; // 75%
  const reserveFactorBps = 1000; // 10%
  
  console.log("Starting pool creation test with manual encoding...");
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);
  
  try {
    // Get nonce
    const nonce = await hre.ethers.provider.getTransactionCount(signer.address);
    console.log("Nonce:", nonce);
    
    // Get gas price
    const feeData = await hre.ethers.provider.getFeeData();
    console.log("Fee data:", {
      gasPrice: feeData.gasPrice?.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
    });
    
    // Encode function call
    const iface = new ethers.Interface([
      "function createLendingPool(address _asset, string _name, string _symbol, uint256 _collateralFactorBps, uint256 _reserveFactorBps) external payable returns (address)"
    ]);
    
    const encodedData = iface.encodeFunctionData("createLendingPool", [
      assetAddress,
      poolName,
      poolSymbol,
      collateralFactorBps,
      reserveFactorBps
    ]);
    
    console.log("Encoded data:", encodedData);
    
    // Create transaction
    const tx = {
      to: factoryAddress,
      nonce: nonce,
      data: encodedData,
      value: ethers.parseEther("0.05"),
      gasLimit: 5000000,
      type: 2,
      maxFeePerGas: feeData.maxFeePerGas || ethers.parseUnits("100", "gwei"),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits("5", "gwei"),
      chainId: (await hre.ethers.provider.getNetwork()).chainId
    };
    
    console.log("Transaction:", {
      to: tx.to,
      nonce: tx.nonce,
      value: tx.value.toString(),
      gasLimit: tx.gasLimit.toString(),
      maxFeePerGas: tx.maxFeePerGas.toString(),
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas.toString(),
      chainId: tx.chainId
    });
    
    // Send transaction
    const txResponse = await signer.sendTransaction(tx);
    console.log("Transaction sent:", txResponse.hash);
    
    // Wait for transaction
    const receipt = await txResponse.wait();
    console.log("Transaction receipt:", receipt);
    
    if (receipt.status === 1) {
      console.log("Pool created successfully!");
      
      // Get the created pool address from logs
      const factory = await hre.ethers.getContractAt("LoanPoolFactory", factoryAddress);
      const poolAddress = await factory.assetToPools(assetAddress);
      console.log("Created pool address:", poolAddress);
    } else {
      console.log("Transaction failed!");
    }
    
  } catch (error) {
    console.error("Error:", error);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.transaction) {
      console.error("Transaction:", error.transaction);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 