import { expect, ethers } from "./helpers/setup";
import { ContractFactory, Log } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { PresaleTokenContract } from "./helpers/setup";
import hre from "hardhat";

interface FactoryTestContext {
  TokenFactory: ContractFactory;
  factory: any;
  TokenTemplate: ContractFactory;
  owner: HardhatEthersSigner;
  addr1: HardhatEthersSigner;
  addr2: HardhatEthersSigner;
}

describe("TokenFactory_v2.1.0", function () {
  let context: FactoryTestContext;

  beforeEach(async function () {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();

    // Deploy template implementation
    const TokenTemplate = await hre.ethers.getContractFactory("TokenTemplate_v2_1_0");
    const implementation = await TokenTemplate.deploy();

    // Deploy factory
    const TokenFactory = await hre.ethers.getContractFactory("TokenFactory_v2_1_0");
    const factory = await TokenFactory.deploy(implementation.target);

    context = {
      TokenFactory,
      factory,
      TokenTemplate,
      owner,
      addr1,
      addr2
    };
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await context.factory.owner()).to.equal(context.owner.address);
    });

    it("Should set the correct template address", async function () {
      expect(await context.factory.templateImplementation())
        .to.equal(await context.factory.getTemplateImplementation());
    });

    it("Should have correct version info", async function () {
      expect(await context.factory.VERSION()).to.equal("2.1.0");
    });
  });

  describe("Token Creation", function () {
    const tokenParams = {
      name: "Test Token",
      symbol: "TEST",
      initialSupply: ethers.parseEther("1000000"),
      maxSupply: ethers.parseEther("10000000"),
      enableBlacklist: true,
      enableTimeLock: true,
      presaleRate: ethers.parseUnits("1000", 0), // 1 ETH = 1000 tokens
      minContribution: ethers.parseEther("0.1"),
      maxContribution: ethers.parseEther("10"),
      presaleCap: ethers.parseEther("100")
    };

    it("Should create a new token with correct parameters", async function () {
      const tx = await context.factory.createToken(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.enableBlacklist,
        tokenParams.enableTimeLock,
        tokenParams.presaleRate,
        tokenParams.minContribution,
        tokenParams.maxContribution,
        tokenParams.presaleCap
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === "TokenCreated"
      );
      expect(event).to.not.be.undefined;

      const tokenAddress = event.args.token;
      const token = context.TokenTemplate.attach(tokenAddress);

      expect(await token.name()).to.equal(tokenParams.name);
      expect(await token.symbol()).to.equal(tokenParams.symbol);
      expect(await token.totalSupply()).to.equal(tokenParams.initialSupply);
      expect(await token.maxSupply()).to.equal(tokenParams.maxSupply);
      expect(await token.blacklistEnabled()).to.equal(tokenParams.enableBlacklist);
      expect(await token.timeLockEnabled()).to.equal(tokenParams.enableTimeLock);
      expect(await token.presaleRate()).to.equal(tokenParams.presaleRate);
      expect(await token.minContribution()).to.equal(tokenParams.minContribution);
      expect(await token.maxContribution()).to.equal(tokenParams.maxContribution);
      expect(await token.presaleCap()).to.equal(tokenParams.presaleCap);
      expect(await token.owner()).to.equal(context.owner.address);
    });

    it("Should track created tokens", async function () {
      await context.factory.createToken(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.enableBlacklist,
        tokenParams.enableTimeLock,
        tokenParams.presaleRate,
        tokenParams.minContribution,
        tokenParams.maxContribution,
        tokenParams.presaleCap
      );

      const tokens = await context.factory.getDeployedTokens();
      expect(tokens.length).to.equal(1);
    });

    it("Should allow only owner to create tokens", async function () {
      await expect(context.factory.connect(context.addr1).createToken(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.enableBlacklist,
        tokenParams.enableTimeLock,
        tokenParams.presaleRate,
        tokenParams.minContribution,
        tokenParams.maxContribution,
        tokenParams.presaleCap
      )).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer factory ownership", async function () {
      await context.factory.transferOwnership(context.addr1.address);
      expect(await context.factory.owner()).to.equal(context.addr1.address);

      // New owner should be able to create tokens
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
        initialSupply: ethers.parseEther("1000000"),
        maxSupply: ethers.parseEther("10000000"),
        enableBlacklist: true,
        enableTimeLock: true,
        presaleRate: ethers.parseUnits("1000", 0),
        minContribution: ethers.parseEther("0.1"),
        maxContribution: ethers.parseEther("10"),
        presaleCap: ethers.parseEther("100")
      };

      await expect(context.factory.connect(context.addr1).createToken(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.enableBlacklist,
        tokenParams.enableTimeLock,
        tokenParams.presaleRate,
        tokenParams.minContribution,
        tokenParams.maxContribution,
        tokenParams.presaleCap
      )).not.to.be.reverted;
    });
  });
}); 