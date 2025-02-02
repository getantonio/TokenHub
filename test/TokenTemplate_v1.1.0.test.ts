const { expect, ethers, deployTokenTemplate } = require("./helpers/setup");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TokenTemplate_v1.1.0", function () {
  let TokenTemplate;
  let token;
  let owner;
  let addr1;
  let addr2;
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const MAX_SUPPLY = ethers.parseEther("10000000"); // 10M tokens

  beforeEach(async function () {
    const context = await deployTokenTemplate("v1_1_0");
    TokenTemplate = context.TokenTemplate;
    token = context.token;
    owner = context.owner;
    addr1 = context.addr1;
    addr2 = context.addr2;
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

    it("Should have correct version info", async function () {
      expect(await token.VERSION()).to.equal("1.1.0");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens up to max supply", async function () {
      const mintAmount = ethers.parseEther("1000000");
      await token.mint(addr1.address, mintAmount);
      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should prevent minting beyond max supply", async function () {
      const mintAmount = ethers.parseEther("9000001"); // Would exceed 10M max
      await expect(token.mint(addr1.address, mintAmount))
        .to.be.revertedWith("Exceeds max supply");
    });
  });

  describe("Blacklist", function () {
    it("Should allow owner to blacklist addresses", async function () {
      await token.setBlacklistStatus(addr1.address, true);
      expect(await token.isBlacklisted(addr1.address)).to.be.true;
    });

    it("Should prevent transfers to/from blacklisted addresses", async function () {
      const amount = ethers.parseEther("1000");
      await token.transfer(addr1.address, amount);
      await token.setBlacklistStatus(addr1.address, true);
      await expect(token.connect(addr1).transfer(addr2.address, amount))
        .to.be.revertedWith("Address is blacklisted");
    });
  });

  describe("TimeLock", function () {
    it("Should allow owner to set lock time", async function () {
      const lockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      await token.setLockTime(addr1.address, lockTime);
      expect(await token.getLockTime(addr1.address)).to.equal(lockTime);
    });

    it("Should prevent transfers before lock time expires", async function () {
      const amount = ethers.parseEther("1000");
      await token.transfer(addr1.address, amount);
      const lockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      await token.setLockTime(addr1.address, lockTime);
      await expect(token.connect(addr1).transfer(addr2.address, amount))
        .to.be.revertedWith("Tokens are locked");
    });
  });

  describe("Pause/Unpause", function () {
    it("Should allow owner to pause and unpause transfers", async function () {
      await token.pause();
      const amount = ethers.parseEther("1000");
      await expect(token.transfer(addr1.address, amount))
        .to.be.revertedWith("Pausable: paused");
      
      await token.unpause();
      await expect(token.transfer(addr1.address, amount))
        .not.to.be.reverted;
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      // Transfer ownership to addr1
      await token.transferOwnership(addr1.address);
      expect(await token.owner()).to.equal(addr1.address);
      
      // Original owner should no longer have privileges
      await expect(token.pause())
        .to.be.revertedWith("Ownable: caller is not the owner");
      
      // New owner should have privileges
      await token.connect(addr1).pause();
      expect(await token.paused()).to.be.true;
    });

    it("Should allow two-step ownership transfer", async function () {
      // Initiate transfer
      await token.transferOwnership(addr1.address);
      
      // New owner must accept ownership
      await token.connect(addr1).acceptOwnership();
      expect(await token.owner()).to.equal(addr1.address);
    });

    it("Should allow owner to renounce ownership", async function () {
      await token.renounceOwnership();
      expect(await token.owner()).to.equal("0x0000000000000000000000000000000000000000");
      
      // No one should have owner privileges after renouncing
      await expect(token.pause())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 