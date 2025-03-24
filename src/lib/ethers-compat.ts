// This file provides compatibility for different ethers versions
// And avoids runtime errors during build

// Safe import of BrowserProvider from ethers
export const getBrowserProvider = () => {
  // Return a mock provider during build/server-side rendering
  if (typeof window === 'undefined') {
    return class MockBrowserProvider {
      constructor(provider: any) {
        // Mock implementation
      }
      
      static isProvider() {
        return false;
      }
      
      async getSigner() {
        return {
          getAddress: async () => '0x0000000000000000000000000000000000000000'
        };
      }
    };
  } 
  
  // In browser, dynamically import ethers
  return null; // Will be dynamically imported at runtime
};

// Safe version of Contract
export const getContract = () => {
  // Return a mock contract during build/server-side rendering
  if (typeof window === 'undefined') {
    return class MockContract {
      constructor(address: string, abi: any, signerOrProvider: any) {
        // Mock implementation
      }
      
      static getContractAddress() {
        return '0x0000000000000000000000000000000000000000';
      }
    };
  }
  
  // In browser, dynamically import ethers
  return null; // Will be dynamically imported at runtime
};

// Utility function to safely parse ether values
export const safeParseEther = (value: string) => {
  if (typeof window === 'undefined') {
    return BigInt(0);
  }
  
  // In browser, will be implemented at runtime
  return null;
};

// Utility function to safely format ether values
export const safeFormatEther = (value: bigint | string) => {
  if (typeof window === 'undefined') {
    return '0.0';
  }
  
  // In browser, will be implemented at runtime
  return null;
};

// Runtime implementation - only runs in browser
export const initEthersCompat = async () => {
  if (typeof window !== 'undefined') {
    try {
      // Dynamically import ethers only on client-side
      const ethers = await import('ethers');
      
      // Replace the null implementations with real ones
      const realBrowserProvider = ethers.BrowserProvider;
      const realContract = ethers.Contract;
      
      // Set up runtime implementations
      (getBrowserProvider as any).implementation = realBrowserProvider;
      (getContract as any).implementation = realContract;
      (safeParseEther as any).implementation = ethers.parseEther;
      (safeFormatEther as any).implementation = ethers.formatEther;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize ethers compatibility layer:', error);
      return false;
    }
  }
  
  return false;
}; 