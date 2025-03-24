import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import { FACTORY_ABI_FIXED } from '@/contracts/abi/TokenFactory_v2_DirectDEX_Fixed';
import { TransactionReceipt } from "ethers";

export interface TokenParams {
  name: string;
  symbol: string;
  totalSupply: bigint;
  maxTxAmount: bigint;
  maxWalletAmount: bigint;
  enableTrading: boolean;
  tradingStartTime: bigint;
  marketingFeePercentage: bigint;
  marketingWallet: string;
  developmentFeePercentage: bigint;
  developmentWallet: string;
  autoLiquidityFeePercentage: bigint;
  enableBuyFees: boolean;
  enableSellFees: boolean;
}

export const createTokenWithFee = async (params: TokenParams): Promise<string> => {
  console.log("🚀 NEW TOKEN CREATOR RUNNING v1.0 🚀");
  
  // Use the BSC Testnet factory address
  const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4 || '0x0000000000000000000000000000000000000000';

  if (!process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4) {
    console.error('Missing required environment variable: NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V4');
  }
  
  console.log(`Using BSC Testnet factory at address: ${FACTORY_ADDRESS}`);
  
  // Set hardcoded listing fee
  const listingFee = parseEther("0.001");
  console.log(`Using listing fee: ${formatEther(listingFee)} BNB (${listingFee.toString()})`);
  
  // Setup provider and signer
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  // Setup contract
  const factory = new Contract(
    FACTORY_ADDRESS,
    FACTORY_ABI_FIXED,
    signer
  );
  
  // Log parameters
  console.log("Creating token with params:", {
    ...params,
    totalSupply: params.totalSupply.toString(),
    maxTxAmount: params.maxTxAmount.toString(),
    maxWalletAmount: params.maxWalletAmount.toString(),
    tradingStartTime: params.tradingStartTime.toString(),
    marketingFeePercentage: params.marketingFeePercentage.toString(),
    developmentFeePercentage: params.developmentFeePercentage.toString(),
    autoLiquidityFeePercentage: params.autoLiquidityFeePercentage.toString(),
  });
  
  // First try direct contract call
  try {
    // Call directly with explicit value
    console.log(`Sending transaction with value: ${formatEther(listingFee)} BNB`);
    const tx = await factory.createToken(
      params,
      {
        value: listingFee,
        gasLimit: BigInt(5000000)
      }
    );
    
    console.log('Transaction sent:', tx.hash);
    
    // Wait for receipt
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);
    
    if (receipt.status === 0) {
      throw new Error("Transaction failed");
    }
    
    // Find TokenCreated event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return factory.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find((event: any) => event && event.name === "TokenCreated");
      
    if (event) {
      const tokenAddress = event.args.token;
      console.log(`Token created at: ${tokenAddress}`);
      return tokenAddress;
    } else {
      throw new Error("Token created but event not found");
    }
  } catch (error: any) {
    console.error("Error creating token:", error);
    
    // Try fallback method with window.ethereum
    try {
      console.log("Trying fallback method with window.ethereum");
      
      // Encode function data
      const data = factory.interface.encodeFunctionData("createToken", [params]);
      console.log("Encoded function data:", data.substring(0, 66) + "...");
      
      // Get account
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];
      
      // Format value as hex
      const valueHex = '0x' + listingFee.toString(16);
      console.log(`Value in hex: ${valueHex}`);
      
      // Send transaction
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: from,
          to: FACTORY_ADDRESS,
          data: data,
          value: valueHex,
          gas: '0x' + (5000000).toString(16)
        }],
      });
      
      console.log('Transaction sent with hash:', txHash);
      
      // Wait for confirmation
      let receipt: TransactionReceipt | null = null;
      for (let i = 0; i < 30; i++) {
        try {
          receipt = await provider.getTransactionReceipt(txHash);
          if (receipt) break;
        } catch (e) {
          console.warn("Error checking receipt:", e);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      
      if (!receipt) {
        throw new Error("Transaction timed out");
      }
      
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }
      
      console.log("Transaction confirmed:", receipt);
      
      // Try to get token address from logs
      const logs = await provider.getLogs({
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
        address: FACTORY_ADDRESS
      });
      
      for (const log of logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed && parsed.name === "TokenCreated") {
            const tokenAddress = parsed.args.token;
            console.log(`Token created at: ${tokenAddress}`);
            return tokenAddress;
          }
        } catch (e) {}
      }
      
      throw new Error("Token created but address not found");
    } catch (fallbackError: any) {
      console.error("Fallback method failed:", fallbackError);
      throw fallbackError;
    }
  }
} 