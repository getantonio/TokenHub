const hardhat = require("hardhat");

async function waitForConfirmations(txHash: string, confirmations = 5) {
  console.log(`Waiting for ${confirmations} confirmations...`);
  await hardhat.ethers.provider.waitForTransaction(txHash, confirmations);
}

async function verifyContract(address: string, constructorArguments: any[] = []) {
  await waitForConfirmations(address);
  await hardhat.run("verify:verify", {
    address,
    constructorArguments,
  });
}

module.exports = {
  waitForConfirmations,
  verifyContract,
}; 