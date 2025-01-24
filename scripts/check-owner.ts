import { ethers } from "hardhat";

async function main() {
  const factoryAddress = "0xdd609116F6292a8D94b98537349962C22Bf72aD9";
  const factory = await ethers.getContractAt("TokenFactory", factoryAddress);

  const owner = await factory.owner();
  const platformTeamWallet = await factory.platformTeamWallet();
  const creationFee = await factory.creationFee();

  console.log("TokenFactory Contract Info:");
  console.log("---------------------------");
  console.log("Contract Address:", factoryAddress);
  console.log("Owner Address:", owner);
  console.log("Platform Team Wallet:", platformTeamWallet);
  console.log("Creation Fee:", ethers.formatEther(creationFee), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 