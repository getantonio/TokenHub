import { expect, ethers } from "./helpers/setup";
import hre from "hardhat";

describe("TokenFactory_v1.1.0", function () {
  let TokenFactory;
  let factory;
  let TokenTemplate;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await hre.ethers.getSigners();

    // Deploy template implementation
    TokenTemplate = await hre.ethers.getContractFactory("TokenTemplate_v1_1_0");
    const implementation = await TokenTemplate.deploy();

    // Deploy factory
    TokenFactory = await hre.ethers.getContractFactory("TokenFactory_v1_1_0");
    factory = await TokenFactory.deploy(implementation.target);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should set the correct template address", async function () {
      expect(await factory.templateImplementation()).to.equal(await factory.getTemplateImplementation());
    });

    it("Should have correct version info", async function () {
      expect(await factory.VERSION()).to.equal("1.1.0");
    });
  });

  describe("Token Creation", function () {
    const tokenParams = {
      name: "Test Token",
      symbol: "TEST",
      initialSupply: ethers.parseEther("1000000"),
      maxSupply: ethers.parseEther("10000000"),
      enableBlacklist: true,
      enableTimeLock: true
    };

    it("Should create a new token with correct parameters", async function () {
      const tx = await factory.createToken(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.enableBlacklist,
        tokenParams.enableTimeLock
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === "TokenCreated"
      );
      expect(event).to.not.be.undefined;

      const tokenAddress = event.args.token;
      const token = TokenTemplate.attach(tokenAddress);

      expect(await token.name()).to.equal(tokenParams.name);
      expect(await token.symbol()).to.equal(tokenParams.symbol);
      expect(await token.totalSupply()).to.equal(tokenParams.initialSupply);
      expect(await token.maxSupply()).to.equal(tokenParams.maxSupply);
      expect(await token.blacklistEnabled()).to.equal(tokenParams.enableBlacklist);
      expect(await token.timeLockEnabled()).to.equal(tokenParams.enableTimeLock);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should track created tokens", async function () {
      await factory.createToken(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.enableBlacklist,
        tokenParams.enableTimeLock
      );

      const tokens = await factory.getDeployedTokens();
      expect(tokens.length).to.equal(1);
    });

    it("Should allow only owner to create tokens", async function () {
      await expect(factory.connect(addr1).createToken(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.enableBlacklist,
        tokenParams.enableTimeLock
      )).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer factory ownership", async function () {
      await factory.transferOwnership(addr1.address);
      expect(await factory.owner()).to.equal(addr1.address);

      // New owner should be able to create tokens
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
        initialSupply: ethers.parseEther("1000000"),
        maxSupply: ethers.parseEther("10000000"),
        enableBlacklist: true,
        enableTimeLock: true
      };

      await expect(factory.connect(addr1).createToken(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.enableBlacklist,
        tokenParams.enableTimeLock
      )).not.to.be.reverted;
    });
  });
}); 