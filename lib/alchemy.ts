import { Network, Alchemy } from "alchemy-sdk";

if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_API_KEY is required");
}

const settings = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_SEPOLIA,
};

export const alchemy = new Alchemy(settings);

export async function getContractOwner(contractAddress: string): Promise<string | null> {
  try {
    // Get the contract's owner using the owner() function
    const data = await alchemy.core.call({
      to: contractAddress,
      data: "0x8da5cb5b" // owner() function signature
    });
    
    // Convert the returned bytes32 to an address
    return "0x" + data.slice(26);
  } catch (error) {
    console.error("Error getting contract owner:", error);
    return null;
  }
}

export async function getContractEvents(contractAddress: string, eventName: string) {
  try {
    const logs = await alchemy.core.getLogs({
      address: contractAddress,
      fromBlock: "0x0",
      toBlock: "latest",
      topics: [eventName]
    });
    return logs;
  } catch (error) {
    console.error("Error getting contract events:", error);
    return [];
  }
} 