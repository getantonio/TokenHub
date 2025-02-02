const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenFactory_v1", function () {
  let TokenFactory;
  let factory;
  let owner;
  let addr1;
  let addr2;
  const DEPLOYMENT_FEE = ethers.parseEther("0.0001"); // 0.0001 ETH

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    TokenFactory = await ethers.getContractFactory("TokenFactory_v1");
    factory = await TokenFactory.deploy(DEPLOYMENT_FEE);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should set the correct deployment fee", async function () {
      expect(await factory.deploymentFee()).to.equal(DEPLOYMENT_FEE);
    });

    it("Should start with zero tokens created", async function () {
      expect(await factory.tokensCreated()).to.equal(0);
    });
  });

  describe("Token Creation", function () {
    const TOKEN_NAME = "Test Token";
    const TOKEN_SYMBOL = "TEST";
    const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
    const MAX_SUPPLY = ethers.parseEther("10000000"); // 10M tokens

    it("Should create a new token with correct parameters", async function () {
      const tx = await factory.createToken(
        TOKEN_NAME,
        TOKEN_SYMBOL,
        INITIAL_SUPPLY,
        MAX_SUPPLY,
        true, // enableBlacklist
        true, // enableTimeLock
        { value: DEPLOYMENT_FEE }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.topics[0] === factory.interface.getEvent("TokenCreated").topicHash
      );
      const decodedEvent = factory.interface.parseLog({ topics: event.topics, data: event.data });
      const tokenAddress = decodedEvent.args[0];

      // Get the token contract
      const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1");
      const token = TokenTemplate.attach(tokenAddress);

      // Verify token contract parameters
      expect(await token.name()).to.equal(TOKEN_NAME);
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await token.maxSupply()).to.equal(MAX_SUPPLY);
      expect(await token.blacklistEnabled()).to.be.true;
      expect(await token.timeLockEnabled()).to.be.true;
      expect(await token.owner()).to.equal(owner.address);

      // Also verify factory storage
      const tokenInfo = await factory.getTokenInfo(tokenAddress);
      expect(tokenInfo.name).to.equal(TOKEN_NAME);
      expect(tokenInfo.symbol).to.equal(TOKEN_SYMBOL);
      expect(tokenInfo.initialSupply).to.equal(INITIAL_SUPPLY);
      expect(tokenInfo.maxSupply).to.equal(MAX_SUPPLY);
      expect(tokenInfo.blacklistEnabled).to.be.true;
      expect(tokenInfo.timeLockEnabled).to.be.true;
      expect(tokenInfo.owner).to.equal(owner.address);

      // Also verify that the token is in the user's token list
      const userTokens = await factory.getTokensByUser(owner.address);
      expect(userTokens[0]).to.equal(tokenAddress);
    });

    it("Should fail if deployment fee is insufficient", async function () {
      await expect(
        factory.createToken(
          TOKEN_NAME,
          TOKEN_SYMBOL,
          INITIAL_SUPPLY,
          MAX_SUPPLY,
          true,
          true,
          { value: ethers.parseEther("0.00005") }
        )
      ).to.be.revertedWith("Insufficient deployment fee");
    });

    it("Should track tokens created by user", async function () {
      await factory.createToken(
        TOKEN_NAME,
        TOKEN_SYMBOL,
        INITIAL_SUPPLY,
        MAX_SUPPLY,
        true,
        true,
        { value: DEPLOYMENT_FEE }
      );

      const userTokens = await factory.getTokensByUser(owner.address);
      expect(userTokens.length).to.equal(1);
    });

    it("Should increment tokensCreated counter", async function () {
      await factory.createToken(
        TOKEN_NAME,
        TOKEN_SYMBOL,
        INITIAL_SUPPLY,
        MAX_SUPPLY,
        true,
        true,
        { value: DEPLOYMENT_FEE }
      );

      expect(await factory.tokensCreated()).to.equal(1);
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to update deployment fee", async function () {
      const newFee = ethers.parseEther("0.0002");
      await factory.setDeploymentFee(newFee);
      expect(await factory.deploymentFee()).to.equal(newFee);
    });

    it("Should not allow non-owner to update deployment fee", async function () {
      const newFee = ethers.parseEther("0.0002");
      await expect(
        factory.connect(addr1).setDeploymentFee(newFee)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to withdraw fees", async function () {
      // Create a token to generate fees
      await factory.createToken(
        "Test",
        "TST",
        ethers.parseEther("1000000"),
        ethers.parseEther("10000000"),
        true,
        true,
        { value: DEPLOYMENT_FEE }
      );

      const initialBalance = await ethers.provider.getBalance(owner.address);
      await factory.withdrawFees();
      const finalBalance = await ethers.provider.getBalance(owner.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should not allow non-owner to withdraw fees", async function () {
      await expect(
        factory.connect(addr1).withdrawFees()
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });

  describe("Token Queries", function () {
    beforeEach(async function () {
      await factory.createToken(
        "Test 1",
        "TST1",
        ethers.parseEther("1000000"),
        ethers.parseEther("10000000"),
        true,
        true,
        { value: DEPLOYMENT_FEE }
      );
    });

    it("Should return correct token info", async function () {
      const userTokens = await factory.getTokensByUser(owner.address);
      const tokenInfo = await factory.getTokenInfo(userTokens[0]);

      expect(tokenInfo.name).to.equal("Test 1");
      expect(tokenInfo.symbol).to.equal("TST1");
      expect(tokenInfo.owner).to.equal(owner.address);
    });

    it("Should return empty array for users with no tokens", async function () {
      const userTokens = await factory.getTokensByUser(addr1.address);
      expect(userTokens.length).to.equal(0);
    });
  });
}); 