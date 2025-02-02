const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenTemplate_v1", function () {
  let TokenTemplate;
  let token;
  let owner;
  let addr1;
  let addr2;
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const MAX_SUPPLY = ethers.parseEther("10000000"); // 10M tokens

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy implementation
    TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1");
    const implementation = await TokenTemplate.deploy();

    // Deploy proxy
    const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const initData = TokenTemplate.interface.encodeFunctionData("initialize", [
      "Test Token",
      "TEST",
      INITIAL_SUPPLY,
      MAX_SUPPLY,
      owner.address,
      true, // enableBlacklist
      true  // enableTimeLock
    ]);

    const proxy = await ERC1967Proxy.deploy(
      implementation.target,
      initData
    );

    // Get token instance
    token = TokenTemplate.attach(proxy.target);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });

    it("Should set the max supply correctly", async function () {
      expect(await token.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it("Should enable features correctly", async function () {
      expect(await token.blacklistEnabled()).to.be.true;
      expect(await token.timeLockEnabled()).to.be.true;
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      await token.transfer(addr1.address, 50);
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Blacklist", function () {
    it("Should prevent blacklisted address from sending tokens", async function () {
      await token.transfer(addr1.address, 100);
      await token.setBlacklistStatus(addr1.address, true);
      
      await expect(
        token.connect(addr1).transfer(addr2.address, 50)
      ).to.be.revertedWith("Address is blacklisted");
    });

    it("Should prevent sending tokens to blacklisted address", async function () {
      await token.setBlacklistStatus(addr1.address, true);
      await expect(
        token.transfer(addr1.address, 50)
      ).to.be.revertedWith("Address is blacklisted");
    });

    it("Should allow transfer after removing from blacklist", async function () {
      await token.setBlacklistStatus(addr1.address, true);
      await token.setBlacklistStatus(addr1.address, false);
      await expect(token.transfer(addr1.address, 50)).to.not.be.reverted;
    });
  });

  describe("TimeLock", function () {
    it("Should prevent transfer when tokens are time-locked", async function () {
      await token.transfer(addr1.address, 100);
      const oneHour = 3600;
      const lockTime = Math.floor(Date.now() / 1000) + oneHour;
      await token.setLockTime(addr1.address, lockTime);

      await expect(
        token.connect(addr1).transfer(addr2.address, 50)
      ).to.be.revertedWith("Tokens are locked");
    });

    it("Should allow transfer after lock time expires", async function () {
      await token.transfer(addr1.address, 100);
      const currentTime = Math.floor(Date.now() / 1000);
      const lockTime = currentTime + 3600; // 1 hour from now
      await token.setLockTime(addr1.address, lockTime);

      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [3601]); // Advance time by more than 1 hour
      await ethers.provider.send("evm_mine"); // Mine a new block

      await expect(
        token.connect(addr1).transfer(addr2.address, 50)
      ).to.not.be.reverted;
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await token.mint(addr1.address, mintAmount);
      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should fail if minting would exceed max supply", async function () {
      const mintAmount = MAX_SUPPLY;
      await expect(
        token.mint(addr1.address, mintAmount)
      ).to.be.revertedWith("Exceeds max supply");
    });

    it("Should not allow non-owner to mint", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        token.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Feature Management", function () {
    it("Should allow owner to toggle blacklist", async function () {
      await token.toggleBlacklist(false);
      expect(await token.blacklistEnabled()).to.be.false;
    });

    it("Should allow owner to toggle timelock", async function () {
      await token.toggleTimeLock(false);
      expect(await token.timeLockEnabled()).to.be.false;
    });

    it("Should ignore blacklist when feature is disabled", async function () {
      await token.setBlacklistStatus(addr1.address, true);
      await token.toggleBlacklist(false);
      await expect(token.transfer(addr1.address, 50)).to.not.be.reverted;
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause transfers", async function () {
      // First transfer some tokens to test with
      await token.transfer(addr1.address, 100);
      
      // Then pause and try to transfer
      await token.pause();
      await expect(
        token.transfer(addr2.address, 50)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("Should allow owner to unpause transfers", async function () {
      // First transfer some tokens to test with
      await token.transfer(addr1.address, 100);
      
      // Then pause, unpause, and try to transfer
      await token.pause();
      await token.unpause();
      await expect(token.transfer(addr2.address, 50)).to.not.be.reverted;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        token.connect(addr1).pause()
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });
}); 