const hre = require("hardhat");

async function main() {
  const v1Address = "0x71C57cEdbf3952423369e6aE036Da600a521a0dE";
  const v2Address = "0x10AE68b07e7380f3D937139b146A7211Ad4e068a";
  
  // Get the contract factories
  const TokenFactory_v1 = await hre.ethers.getContractFactory("TokenFactory_v1_1_0");
  const TokenFactory_v2 = await hre.ethers.getContractFactory("TokenFactory_v2_1_0");
  
  // Attach to the deployed contracts
  const v1Factory = TokenFactory_v1.attach(v1Address);
  const v2Factory = TokenFactory_v2.attach(v2Address);
  
  // Get owners
  const v1Owner = await v1Factory.owner();
  const v2Owner = await v2Factory.owner();
  
  console.log("V1 Factory Owner:", v1Owner);
  console.log("V2 Factory Owner:", v2Owner);
  console.log("Expected Owner: 0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F");
  console.log("V1 Matches:", v1Owner.toLowerCase() === "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F".toLowerCase());
  console.log("V2 Matches:", v2Owner.toLowerCase() === "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F".toLowerCase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 