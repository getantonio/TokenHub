// Helper function to safely execute contract calls that might use ENS
export const safeContractCall = async <T,>(fn: () => Promise<T>, fallbackValue: T, errorHandler?: (error: any) => void): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && 
        error.message.includes('network does not support ENS')) {
      console.warn('ENS resolution error in contract call:', error);
      if (errorHandler) {
        errorHandler(error);
      }
      return fallbackValue;
    }
    throw error;
  }
};

// Helper function to safely get code on networks that might not support ENS
export const safeGetCode = async (provider: any, address: string): Promise<string> => {
  try {
    return await provider.getCode(address);
  } catch (error) {
    console.warn(`Error getting code for ${address}, network may not support ENS:`, error);
    return '0x';
  }
};

/**
 * This file contains utility functions to handle ENS resolution errors 
 * for networks like Polygon Amoy that don't support ENS. 
 *
 * Instructions:
 * 1. Import these functions where needed in your components
 * 2. Use safeContractCall to wrap any contract calls that might use ENS names
 * 3. Use safeGetCode when checking contract code existence
 *
 * Example usage:
 * ```
 * // Check token allowance with ENS error handling
 * let allowance: bigint;
 * allowance = await safeContractCall(
 *   () => tokenContract.allowance(userAddress, routerAddress),
 *   BigInt(0), // Fallback value
 *   (error) => {
 *     console.warn('Error checking allowance:', error);
 *     toast({
 *       title: "Network Error",
 *       description: "This network doesn't support ENS resolution.",
 *       variant: "destructive"
 *     });
 *   }
 * );
 * ```
 */ 