// Check address checksums
const { ethers } = require("ethers");

// Define addresses
const addresses = [
  "0x6590e7BF6eDF46C489bA94e57573aa4B23F9a029",
  "0xB9DE9F11C157de7F91e63e43F5A0bE10F427e443",
  "0x2dfB8aB079F21cc665f56148bd8b50af3F20a5a0",
  "0x95c8905ab4AC0435c15714cAaa30e62c5e5f726d",
];

// Print checksummed addresses
console.log("Checksummed addresses:");
for (const address of addresses) {
  try {
    const checksummedAddress = ethers.getAddress(address.toLowerCase());
    console.log(`Original: ${address}`);
    console.log(`Checksum: ${checksummedAddress}`);
    console.log(`Is valid: ${address === checksummedAddress ? 'Yes' : 'No'}`);
    console.log('---');
  } catch (error) {
    console.error(`Error with address ${address}:`, error.message);
  }
} 