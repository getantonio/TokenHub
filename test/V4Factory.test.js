const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("V4Factory", function () {
  let V4Factory;
  let factory;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy the factory
    V4Factory = await ethers.getContractFactory("V4Factory");
    factory = await V4Factory.deploy(owner.address);
    await factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should deploy implementation contracts", async function () {
      expect(await factory.tokenImplementation()).to.not.equal(ethers.ZeroAddress);
      expect(await factory.securityModuleImplementation()).to.not.equal(ethers.ZeroAddress);
      expect(await factory.distributionModuleImplementation()).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Token Creation", function () {
    it("Should create a new token with security module", async function () {
      // Create a new token without distribution module
      const tx = await factory.createToken(
        "Test Token",
        "TEST",
        ethers.parseEther("1000"),
        user1.address,
        false // Don't include distribution module
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'TokenCreated'
      );
      
      expect(event).to.not.be.undefined;
      
      // Extract token address from event
      const tokenAddress = event.args[0];
      expect(await factory.isV4Token(tokenAddress)).to.be.true;
      
      // Check token properties
      const tokenABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function balanceOf(address) view returns (uint256)",
        "function owner() view returns (address)",
        "function getModules() view returns (address[])"
      ];
      
      const token = new ethers.Contract(tokenAddress, tokenABI, ethers.provider);
      
      expect(await token.name()).to.equal("Test Token");
      expect(await token.symbol()).to.equal("TEST");
      
      // The security module should be the owner of the token
      const tokenOwner = await token.owner();
      
      // The user1 should have the initial supply
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
      
      // The token should have at least one module (security module)
      const modules = await token.getModules();
      expect(modules.length).to.equal(1); // Only security module
      
      // Verify the security module is properly configured
      const securityModuleABI = [
        "function owner() view returns (address)",
        "function getToken() view returns (address)",
        "function isSigner(address) view returns (bool)"
      ];
      
      const securityModule = new ethers.Contract(tokenOwner, securityModuleABI, ethers.provider);
      
      // Security module owner should be user1
      expect(await securityModule.owner()).to.equal(user1.address);
      
      // Security module should be linked to the token
      expect(await securityModule.getToken()).to.equal(tokenAddress);
      
      // User1 should be a signer
      expect(await securityModule.isSigner(user1.address)).to.be.true;
    });
    
    it("Should create a new token with distribution module", async function () {
      // Create a new token with distribution module
      const tx = await factory.createToken(
        "Distribution Token",
        "DIST",
        ethers.parseEther("1000"),
        user1.address,
        true // Include distribution module
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'TokenCreated'
      );
      
      expect(event).to.not.be.undefined;
      
      // Extract token address from event
      const tokenAddress = event.args[0];
      
      // Check token properties
      const tokenABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function balanceOf(address) view returns (uint256)",
        "function owner() view returns (address)",
        "function getModules() view returns (address[])",
        "function getModuleByType(bytes32) view returns (address)"
      ];
      
      const token = new ethers.Contract(tokenAddress, tokenABI, ethers.provider);
      
      // The token should have two modules (security and distribution)
      const modules = await token.getModules();
      expect(modules.length).to.equal(2);
      
      // Get the distribution module
      const distributionModuleType = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTION_MODULE"));
      const distributionModuleAddress = await token.getModuleByType(distributionModuleType);
      expect(distributionModuleAddress).to.not.equal(ethers.ZeroAddress);
      
      // Verify the distribution module is properly configured
      const distributionModuleABI = [
        "function owner() view returns (address)",
        "function getToken() view returns (address)",
        "function getAvailablePresets() view returns (uint256[], string[])"
      ];
      
      const distributionModule = new ethers.Contract(distributionModuleAddress, distributionModuleABI, ethers.provider);
      
      // Distribution module owner should be user1
      expect(await distributionModule.owner()).to.equal(user1.address);
      
      // Distribution module should be linked to the token
      expect(await distributionModule.getToken()).to.equal(tokenAddress);
      
      // Should have presets available
      const [presetIds, presetNames] = await distributionModule.getAvailablePresets();
      expect(presetIds.length).to.be.greaterThan(0);
      expect(presetNames.length).to.be.greaterThan(0);
      
      // Initial supply should be 0 since distribution will handle it
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("Implementation Upgrades", function () {
    it("Should allow the owner to upgrade implementations", async function () {
      // Deploy new implementation contracts
      const TokenBase = await ethers.getContractFactory("V4TokenBase");
      const newTokenImpl = await TokenBase.deploy();
      await newTokenImpl.waitForDeployment();
      
      const SecurityModule = await ethers.getContractFactory("V4SecurityModule");
      const newSecurityImpl = await SecurityModule.deploy();
      await newSecurityImpl.waitForDeployment();
      
      const DistributionModule = await ethers.getContractFactory("V4DistributionModule");
      const newDistributionImpl = await DistributionModule.deploy();
      await newDistributionImpl.waitForDeployment();
      
      // Upgrade implementations
      await factory.upgradeTokenImplementation(await newTokenImpl.getAddress());
      await factory.upgradeSecurityModuleImplementation(await newSecurityImpl.getAddress());
      await factory.upgradeDistributionModuleImplementation(await newDistributionImpl.getAddress());
      
      // Check that the implementations were updated
      expect(await factory.tokenImplementation()).to.equal(await newTokenImpl.getAddress());
      expect(await factory.securityModuleImplementation()).to.equal(await newSecurityImpl.getAddress());
      expect(await factory.distributionModuleImplementation()).to.equal(await newDistributionImpl.getAddress());
    });
    
    it("Should prevent non-owners from upgrading implementations", async function () {
      const TokenBase = await ethers.getContractFactory("V4TokenBase");
      const newTokenImpl = await TokenBase.deploy();
      await newTokenImpl.waitForDeployment();
      
      // Attempt to upgrade as non-owner
      await expect(
        factory.connect(user1).upgradeTokenImplementation(await newTokenImpl.getAddress())
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("Token Registry", function () {
    it("Should track created tokens", async function () {
      // Create multiple tokens
      await factory.createToken("Token 1", "TK1", ethers.parseEther("1000"), user1.address, false);
      await factory.createToken("Token 2", "TK2", ethers.parseEther("2000"), user2.address, true);
      
      // Check token count
      expect(await factory.getTokenCount()).to.equal(2);
      
      // Get all tokens
      const tokens = await factory.getAllTokens();
      expect(tokens.length).to.equal(2);
      
      // Verify both tokens are registered
      expect(await factory.isV4Token(tokens[0])).to.be.true;
      expect(await factory.isV4Token(tokens[1])).to.be.true;
    });
  });
  
  describe("Distribution Module", function () {
    let tokenAddress;
    let distributionModuleAddress;
    let distributionModule;
    
    beforeEach(async function () {
      // Create a token with distribution module
      const tx = await factory.createToken(
        "Distribution Test",
        "DTEST",
        ethers.parseEther("10000"),
        user1.address,
        true
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'TokenCreated'
      );
      
      tokenAddress = event.args[0];
      
      // Get the token contract
      const tokenABI = [
        "function getModuleByType(bytes32) view returns (address)"
      ];
      const token = new ethers.Contract(tokenAddress, tokenABI, user1.provider);
      
      // Get the distribution module address
      const distributionModuleType = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTION_MODULE"));
      distributionModuleAddress = await token.getModuleByType(distributionModuleType);
      
      // Get the distribution module contract
      const distributionModuleABI = [
        "function addAllocation(address, uint256, string, bool, uint256) returns (bool)",
        "function addMultipleAllocations(address[], uint256[], string[], bool[], uint256[]) returns (bool)",
        "function applyPreset(uint256, uint256) returns (bool)",
        "function removeAllocation(address) returns (bool)",
        "function modifyAllocation(address, uint256, string, bool, uint256) returns (bool)",
        "function getAllAllocations() view returns (tuple(address wallet, uint256 amount, string label, bool locked, uint256 unlockTime)[])",
        "function getAllocation(address) view returns (tuple(address wallet, uint256 amount, string label, bool locked, uint256 unlockTime))",
        "function getAvailablePresets() view returns (uint256[], string[])",
        "function getPresetDetails(uint256) view returns (uint256[], string[])",
        "function executeDistribution() returns (bool)",
        "function unlockTokens(address) returns (bool)"
      ];
      
      distributionModule = new ethers.Contract(
        distributionModuleAddress, 
        distributionModuleABI, 
        user1 // Connect as user1 who is the owner
      );
    });
    
    it("Should allow adding allocations", async function () {
      // Add an allocation
      await distributionModule.addAllocation(
        user2.address,
        ethers.parseEther("1000"),
        "Team",
        false,
        0
      );
      
      // Get the allocation
      const allocation = await distributionModule.getAllocation(user2.address);
      
      expect(allocation.wallet).to.equal(user2.address);
      expect(allocation.amount).to.equal(ethers.parseEther("1000"));
      expect(allocation.label).to.equal("Team");
      expect(allocation.locked).to.be.false;
    });
    
    it("Should allow applying presets", async function () {
      // Get available presets
      const [presetIds, presetNames] = await distributionModule.getAvailablePresets();
      
      // Apply the first preset
      await distributionModule.applyPreset(presetIds[0], ethers.parseEther("10000"));
      
      // Get all allocations
      const allocations = await distributionModule.getAllAllocations();
      
      // Should have created allocations based on the preset
      expect(allocations.length).to.be.greaterThan(0);
      
      // Get preset details to verify
      const [ratios, labels] = await distributionModule.getPresetDetails(presetIds[0]);
      expect(allocations.length).to.equal(ratios.length);
    });
    
    it("Should allow executing distribution", async function () {
      // Add an allocation
      await distributionModule.addAllocation(
        user2.address,
        ethers.parseEther("5000"),
        "Public",
        false,
        0
      );
      
      // Execute the distribution
      await distributionModule.executeDistribution();
      
      // Check user2's balance
      const tokenABI = ["function balanceOf(address) view returns (uint256)"];
      const token = new ethers.Contract(tokenAddress, tokenABI, ethers.provider);
      
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("5000"));
    });
    
    it("Should handle time-locked allocations", async function () {
      // Current timestamp
      const blockNum = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNum);
      const currentTimestamp = block.timestamp;
      
      // Add a locked allocation (unlock in 1 hour)
      const unlockTime = currentTimestamp + 3600;
      await distributionModule.addAllocation(
        user2.address,
        ethers.parseEther("2000"),
        "Team (Locked)",
        true,
        unlockTime
      );
      
      // Execute the distribution
      await distributionModule.executeDistribution();
      
      // Check user2's balance - should be 0 as tokens are locked
      const tokenABI = ["function balanceOf(address) view returns (uint256)"];
      const token = new ethers.Contract(tokenAddress, tokenABI, ethers.provider);
      
      expect(await token.balanceOf(user2.address)).to.equal(0);
      
      // Trying to unlock before time should fail
      await expect(
        distributionModule.unlockTokens(user2.address)
      ).to.be.revertedWith("V4DistributionModule: tokens are still locked");
      
      // Fast forward time (this is a simplified approach, actual implementation depends on the testing framework)
      // In a real test, you would use something like evm_increaseTime
      // For this example, we'll just note that this would be tested in a real environment
    });
  });
}); 