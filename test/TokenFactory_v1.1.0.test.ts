const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;

describe("TokenFactory_v1.1.0", function () {
  let TokenFactory;
  let TokenTemplate;
  let factory;
  let factoryImpl;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy template
    TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1_1_0");
    const template = await TokenTemplate.deploy();

    // Deploy factory implementation
    TokenFactory = await ethers.getContractFactory("TokenFactory_v1_1_0");
    factoryImpl = await TokenFactory.deploy(await template.getAddress());

    // Deploy proxy with initialization
    const initData = factoryImpl.interface.encodeFunctionData("initialize");
    const Proxy = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await Proxy.deploy(
      await factoryImpl.getAddress(),
      initData
    );

    // Get factory instance at proxy address
    factory = TokenFactory.attach(await proxy.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should set the right template implementation", async function () {
      expect(await factory.getTemplateImplementation()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should have correct version info", async function () {
      expect(await factory.VERSION()).to.equal("1.1.0");
    });
  });

  describe("Token Creation", function () {
    it("Should create a new token with correct parameters", async function () {
      const name = "Test Token";
      const symbol = "TEST";
      const initialSupply = ethers.parseEther("1000000");
      const maxSupply = ethers.parseEther("10000000");
      const enableBlacklist = true;
      const enableTimeLock = true;

      await factory.createToken(
        name,
        symbol,
        initialSupply,
        maxSupply,
        enableBlacklist,
        enableTimeLock
      );

      const deployedTokens = await factory.getDeployedTokens();
      expect(deployedTokens.length).to.equal(1);

      const TokenTemplate = await ethers.getContractFactory("TokenTemplate_v1_1_0");
      const token = TokenTemplate.attach(deployedTokens[0]);

      expect(await token.name()).to.equal(name);
      expect(await token.symbol()).to.equal(symbol);
      expect(await token.totalSupply()).to.equal(initialSupply);
      expect(await token.maxSupply()).to.equal(maxSupply);
      expect(await token.blacklistEnabled()).to.equal(enableBlacklist);
      expect(await token.timeLockEnabled()).to.equal(enableTimeLock);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should track created tokens", async function () {
      await factory.createToken(
        "Test Token",
        "TEST",
        ethers.parseEther("1000000"),
        ethers.parseEther("10000000"),
        true,
        true
      );

      const tokens = await factory.getDeployedTokens();
      expect(tokens.length).to.equal(1);
    });

    it("Should only allow owner to create tokens", async function () {
      await expect(
        factory.connect(addr1).createToken(
          "Test",
          "TEST",
          ethers.parseEther("1000000"),
          ethers.parseEther("10000000"),
          true,
          true
        )
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer factory ownership", async function () {
      // Transfer ownership
      await factory.transferOwnership(addr1.address);
      expect(await factory.owner()).to.equal(addr1.address);

      // New owner should be able to create tokens
      await factory.connect(addr1).createToken(
        "Test Token",
        "TEST",
        ethers.parseEther("1000000"),
        ethers.parseEther("10000000"),
        true,
        true
      );
    });
  });
}); 