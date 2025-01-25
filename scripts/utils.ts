import { ethers, run } from "hardhat";

export async function waitForConfirmations(txHash: string, confirmations: number = 5) {
  console.log(`Waiting for ${confirmations} confirmations...`);
  await ethers.provider.waitForTransaction(txHash, confirmations);
}

export async function verifyContract(address: string, constructorArguments: any[] = []) {
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying contract...");
    try {
      await run("verify", {
        address,
        constructorArguments,
      });
      console.log("Contract verified");
    } catch (error) {
      console.log("Verification error:", error);
    }
  }
} 