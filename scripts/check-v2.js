const hre = require("hardhat");

async function main() {
  const v2Address = "0x10AE68b07e7380f3D937139b146A7211Ad4e068a";
  
  // Get provider and contract
  const provider = new hre.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const TokenFactory_v2 = await hre.ethers.getContractFactory("TokenFactory_v2_1_0");
  const v2Factory = TokenFactory_v2.attach(v2Address).connect(provider);

  // Transaction data from error
  const txData = "0x18accac8000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000d3c21bcecceda10000000000000000000000000000000000000000000000000000056bc75e2d6310000000000000000000000000000000000000000000000000003635c9adc5dea00000000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000008ac7230489e8000000000000000000000000000000000000000000000000000000000000679789e0000000000000000000000000000000000000000000000000000000006798cd5000000000000000000000000000000000000000000000000000000000000003e80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a5465737420546f6b656e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007544553545f763200000000000000000000000000000000000000000000000000";

  // Decode function call
  const decodedData = v2Factory.interface.parseTransaction({ data: txData });
  console.log("\nDecoded function call:");
  console.log("Function:", decodedData.name);
  console.log("Arguments:", decodedData.args);

  // Try to estimate gas to see the actual error
  try {
    const [owner] = await hre.ethers.getSigners();
    const gas = await v2Factory.deployToken.estimateGas(
      decodedData.args[0], // name
      decodedData.args[1], // symbol
      decodedData.args[2], // decimals
      decodedData.args[3], // initialSupply
      decodedData.args[4], // softCap
      decodedData.args[5], // hardCap
      decodedData.args[6], // minContribution
      decodedData.args[7], // maxContribution
      decodedData.args[8], // startTime
      decodedData.args[9], // endTime
      decodedData.args[10], // presaleRate
      decodedData.args[11], // whitelistEnabled
      { from: "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F" }
    );
    console.log("\nEstimated gas:", gas);
  } catch (error) {
    console.log("\nGas estimation error:", error);
  }

  // Get factory state
  console.log("\nChecking factory state:");
  console.log("Factory address:", v2Address);
  const deployedTokens = await v2Factory.getDeployedTokens("0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F");
  console.log("Deployed tokens:", deployedTokens);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 