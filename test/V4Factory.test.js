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
    });
  });

  describe("Token Creation", function () {
    it("Should create a new token with security module", async function () {
      // Create a new token
      const tx = await factory.createToken(
        "Test Token",
        "TEST",
        ethers.parseEther("1000"),
        user1.address
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
      expect(modules.length).to.be.at.least(1);
      
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
      
      // Upgrade implementations
      await factory.upgradeTokenImplementation(await newTokenImpl.getAddress());
      await factory.upgradeSecurityModuleImplementation(await newSecurityImpl.getAddress());
      
      // Check that the implementations were updated
      expect(await factory.tokenImplementation()).to.equal(await newTokenImpl.getAddress());
      expect(await factory.securityModuleImplementation()).to.equal(await newSecurityImpl.getAddress());
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
      await factory.createToken("Token 1", "TK1", ethers.parseEther("1000"), user1.address);
      await factory.createToken("Token 2", "TK2", ethers.parseEther("2000"), user2.address);
      
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
}); 