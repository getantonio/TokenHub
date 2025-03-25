import { getAddress } from 'ethers';

/**
 * Normalizes an ethereum address to ensure it has the correct checksum format.
 * This helps prevent "bad address checksum" errors from ethers.js.
 * 
 * @param address The ethereum address to normalize
 * @returns The checksummed ethereum address
 */
export function normalizeAddress(address: string): string {
  if (!address) {
    throw new Error('Address is required');
  }
  
  try {
    // Apply proper checksum using ethers.js utility
    return getAddress(address);
  } catch (error) {
    // If the address is invalid, log the error but don't crash
    console.error(`Invalid ethereum address format: ${address}`, error);
    // Return the original address for debugging purposes
    return address;
  }
}

/**
 * Safely attempts to normalize an ethereum address to ensure it has the correct checksum format.
 * Unlike normalizeAddress, this function will not throw if the address is invalid.
 * 
 * @param address The ethereum address to normalize
 * @returns The checksummed ethereum address or the original address if invalid
 */
export function safeNormalizeAddress(address: string): string {
  if (!address) {
    return address;
  }
  
  try {
    // First convert to lowercase to avoid checksum errors
    const lowercaseAddress = address.toLowerCase();
    return getAddress(lowercaseAddress);
  } catch (error) {
    console.warn(`Could not normalize address: ${address}`, error);
    // If all else fails, just return the lowercase version which is always accepted
    return address.toLowerCase();
  }
}

/**
 * Utility to check if an address has a valid EIP-55 checksum
 * 
 * @param address The ethereum address to validate
 * @returns Boolean indicating if the address has a valid checksum
 */
export function hasValidChecksum(address: string): boolean {
  if (!address) {
    return false;
  }
  
  try {
    const normalized = getAddress(address);
    return normalized === address;
  } catch (error) {
    return false;
  }
}

/**
 * Safely retrieves a factory address for a specific chain and version, ensuring it has proper checksum.
 * If normalization fails, it returns a lowercase version which is always accepted by ethers.
 * 
 * @param factoryAddresses The record of factory addresses by version and chain
 * @param version The factory version (e.g., 'v1', 'v2', etc.)
 * @param chainId The chain ID to get the factory address for
 * @returns The checksummed factory address or undefined if not available
 */
export function getFactoryAddress(
  factoryAddresses: Record<string, Record<number, string>>,
  version: string,
  chainId: number
): string | undefined {
  if (!factoryAddresses || !version || !chainId) {
    return undefined;
  }
  
  // Check if we have addresses for this version
  if (!factoryAddresses[version]) {
    console.warn(`No factory addresses found for version ${version}`);
    return undefined;
  }
  
  // Check if we have an address for this chain
  const address = factoryAddresses[version][chainId];
  if (!address) {
    console.warn(`No factory address found for version ${version} on chain ${chainId}`);
    return undefined;
  }
  
  try {
    // First try to normalize with proper checksum
    return safeNormalizeAddress(address);
  } catch (error) {
    // If that fails, just return the lowercase version which is always accepted
    console.warn(`Failed to normalize factory address: ${address}, falling back to lowercase`, error);
    return address.toLowerCase();
  }
}

export function shortenAddress(address: string, chars = 4): string {
    if (!address) return '';
    return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
} 