import { HardhatRuntimeEnvironment } from 'hardhat/types';
const hardhat = require('hardhat');

export async function waitForConfirmations(address: string, confirmations: number = 5) {
  const tx = await hardhat.ethers.provider.getTransaction(address);
  if (tx) {
    await tx.wait(confirmations);
  }
}

export async function verifyContractOnEtherscan(address: string, constructorArguments: any[] = []) {
  await waitForConfirmations(address);
  await hardhat.run("verify:verify", {
    address,
    constructorArguments,
  });
}

module.exports = {
  waitForConfirmations,
  verifyContractOnEtherscan,
}; 