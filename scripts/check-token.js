const hre = require("hardhat");

async function main() {
  const txHash = "0x8be6318057b27ccb860e5bbc87dbb5d9fc3bc2027ef6ea442025bfe5647ac43d";
  const v1Address = "0x71C57cEdbf3952423369e6aE036Da600a521a0dE";

  // Get provider and contract
  const provider = new hre.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const TokenFactory_v1 = await hre.ethers.getContractFactory("TokenFactory_v1_1_0");
  const v1Factory = TokenFactory_v1.attach(v1Address).connect(provider);

  console.log("Checking transaction:", txHash);
  const receipt = await provider.getTransactionReceipt(txHash);
  console.log("Transaction status:", receipt.status);

  if (receipt.logs) {
    console.log("Found", receipt.logs.length, "logs");
    for (const log of receipt.logs) {
      try {
        const parsedLog = v1Factory.interface.parseLog(log);
        console.log("Parsed log:", parsedLog);
      } catch (e) {
        console.log("Could not parse log:", log);
      }
    }
  }

  console.log("\nGetting all deployed tokens...");
  const deployedTokens = await v1Factory.getDeployedTokens();
  console.log("Deployed tokens:", deployedTokens);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 