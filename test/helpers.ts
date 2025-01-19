import { ethers } from "ethers";

export const DEFAULT_TOKEN_PARAMS = {
  name: "Test Token",
  symbol: "TEST",
  maxSupply: ethers.parseEther("1000000"),
  initialSupply: ethers.parseEther("1000000"),
  tokenPrice: ethers.parseEther("0.0001"),
  maxTransferAmount: 0n,
  cooldownTime: 0n,
  transfersEnabled: true,
  antiBot: false,
  teamVestingDuration: 12n,
  teamVestingCliff: 1n,
  teamAllocation: 10n,
  teamWallet: ethers.ZeroAddress,
};

export const timeTravel = async (seconds: number) => {
  const provider = new ethers.JsonRpcProvider();
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
};

export const getLatestBlockTimestamp = async () => {
  const provider = new ethers.JsonRpcProvider();
  const block = await provider.getBlock("latest");
  return block ? block.timestamp : 0;
}; 