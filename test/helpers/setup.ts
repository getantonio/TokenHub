import { expect } from "chai";
import { BaseContract, Contract, ContractFactory } from "ethers";
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
const hre = require("hardhat");

// Add Hardhat-specific matchers to Chai
require("@nomicfoundation/hardhat-chai-matchers");

// Base token interface
export interface TokenContract extends BaseContract {
  // View functions
  name: () => Promise<string>;
  symbol: () => Promise<string>;
  decimals: () => Promise<number>;
  totalSupply: () => Promise<bigint>;
  maxSupply: () => Promise<bigint>;
  owner: () => Promise<string>;
  blacklistEnabled: () => Promise<boolean>;
  timeLockEnabled: () => Promise<boolean>;
  balanceOf: (account: string) => Promise<bigint>;
  
  // State-changing functions
  transfer: (to: string, amount: bigint) => Promise<any>;
}

// Define presale token interface
export interface PresaleTokenContract extends TokenContract {
  // View functions
  presaleRate: () => Promise<bigint>;
  minContribution: () => Promise<bigint>;
  maxContribution: () => Promise<bigint>;
  presaleCap: () => Promise<bigint>;
  presaleEnabled: () => Promise<boolean>;
  whitelistEnabled: () => Promise<boolean>;
  isWhitelisted: (account: string) => Promise<boolean>;
  
  // State-changing functions
  addToWhitelist: (account: string) => Promise<any>;
  removeFromWhitelist: (account: string) => Promise<any>;
  startPresale: () => Promise<any>;
  endPresale: () => Promise<any>;
  buyTokens: () => Promise<any>;
}

export interface TestContext {
  TokenTemplate: ContractFactory;
  token: TokenContract;
  owner: HardhatEthersSigner;
  addr1: HardhatEthersSigner;
  addr2: HardhatEthersSigner;
}

export interface PresaleTestContext extends TestContext {
  token: PresaleTokenContract;
}

// Helper function to deploy token template
async function deployTokenTemplate(version: string): Promise<TokenContract> {
  const TokenTemplate = await hre.ethers.getContractFactory(`TokenTemplate_${version}`);
  const template = await TokenTemplate.deploy();
  return template as unknown as TokenContract;
}

// Setup types
export type TokenFactory = ContractFactory;
export type Signer = HardhatEthersSigner;

// Re-export what tests will need
const ethers = hre.ethers;
export { expect, ethers };

module.exports = {
    deployTokenTemplate
}; 