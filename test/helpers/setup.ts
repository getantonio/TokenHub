const { expect } = require("chai");
const { HardhatEthersSigner } = require("@nomicfoundation/hardhat-ethers/signers");
const { Contract, ContractFactory, BaseContract } = require("ethers");
const hre = require("hardhat");

// Add Hardhat-specific matchers to Chai
require("@nomicfoundation/hardhat-chai-matchers");

// Define base token interface
export interface TokenContract extends BaseContract {
  owner(): Promise<string>;
  balanceOf(address: string): Promise<bigint>;
  totalSupply(): Promise<bigint>;
  maxSupply(): Promise<bigint>;
  blacklistEnabled(): Promise<boolean>;
  timeLockEnabled(): Promise<boolean>;
  VERSION(): Promise<string>;
  mint(to: string, amount: bigint): Promise<any>;
  transfer(to: string, amount: bigint): Promise<any>;
  setBlacklistStatus(address: string, status: boolean): Promise<any>;
  isBlacklisted(address: string): Promise<boolean>;
  setLockTime(address: string, time: number): Promise<any>;
  getLockTime(address: string): Promise<number>;
  pause(): Promise<any>;
  unpause(): Promise<any>;
  paused(): Promise<boolean>;
  transferOwnership(address: string): Promise<any>;
  acceptOwnership(): Promise<any>;
  renounceOwnership(): Promise<any>;
}

// Define presale token interface
export interface PresaleTokenContract extends TokenContract {
  presaleRate(): Promise<bigint>;
  minContribution(): Promise<bigint>;
  maxContribution(): Promise<bigint>;
  presaleCap(): Promise<bigint>;
  presaleActive(): Promise<boolean>;
  presaleContributions(address: string): Promise<bigint>;
  startPresale(): Promise<any>;
  finalizePresale(): Promise<any>;
  contribute(overrides?: { value: bigint }): Promise<any>;
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

async function deployTokenTemplate(version) {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();
    
    // Deploy implementation
    const TokenTemplate = await hre.ethers.getContractFactory(`TokenTemplate_${version}`);
    const implementation = await TokenTemplate.deploy();

    // Deploy proxy
    const ERC1967Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
    const initData = TokenTemplate.interface.encodeFunctionData("initialize", [
        "Test Token",
        "TEST",
        hre.ethers.parseEther("1000000"), // 1M initial supply
        hre.ethers.parseEther("10000000"), // 10M max supply
        owner.address,
        true, // enableBlacklist
        true  // enableTimeLock
    ]);

    const proxy = await ERC1967Proxy.deploy(
        implementation.target,
        initData
    );

    // Get token instance
    const token = TokenTemplate.attach(proxy.target);

    return {
        TokenTemplate,
        token,
        owner,
        addr1,
        addr2
    };
}

// Re-export what tests will need
const ethers = hre.ethers;

module.exports = {
    expect,
    ethers,
    deployTokenTemplate
}; 