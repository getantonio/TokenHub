import { ethers } from "hardhat";
import { namehash } from "ethers/lib/utils";

async function main() {
  // Aave V3 Pool Addresses Provider
  const ADDRESSES_PROVIDER = "0x2f39d218133AFaB8F2B48Bc871Ff9DDEa041c3C0";
  
  // ENS Registry
  const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
  
  // Reverse Registrar
  const REVERSE_REGISTRAR = "0x084b1c3C81545d370f3634392De611CaaBFf8148";
  
  // Your new wallet address
  const NEW_OWNER = "0x10C8c279c6b381156733ec160A89Abb260bfcf0C";
  
  // ENS node for getantonio.eth
  const NODE = namehash("getantonio.eth");

  const ENSRecovery = await ethers.getContractFactory("ENSRecovery");
  const recovery = await ENSRecovery.deploy(
    ADDRESSES_PROVIDER,
    ENS_REGISTRY,
    REVERSE_REGISTRAR,
    NEW_OWNER,
    NODE
  );

  await recovery.deployed();
  console.log("ENSRecovery deployed to:", recovery.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 