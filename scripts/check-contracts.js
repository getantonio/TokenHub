const hre = require("hardhat");

async function main() {
  const v1Address = "0x71C57cEdbf3952423369e6aE036Da600a521a0dE";
  const v2Address = "0x10AE68b07e7380f3D937139b146A7211Ad4e068a";

  const provider = new hre.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

  console.log("Checking V1 Factory...");
  const v1Code = await provider.getCode(v1Address);
  console.log("V1 has code:", v1Code !== "0x");

  console.log("\nChecking V2 Factory...");
  const v2Code = await provider.getCode(v2Address);
  console.log("V2 has code:", v2Code !== "0x");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 