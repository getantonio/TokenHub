import { expect, ethers } from "./helpers/setup";
import { PresaleTestContext } from "./helpers/setup";
import hre from "hardhat";

describe("TokenTemplate_v2.1.0", function () {
  let context: PresaleTestContext;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const MAX_SUPPLY = ethers.parseEther("10000000"); // 10M tokens
  const PRESALE_RATE = ethers.parseUnits("1000", 0); // 1 ETH = 1000 tokens
  const MIN_CONTRIBUTION = ethers.parseEther("0.1"); // 0.1 ETH
  const MAX_CONTRIBUTION = ethers.parseEther("10"); // 10 ETH
  const PRESALE_CAP = ethers.parseEther("100"); // 100 ETH

  beforeEach(async function () {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();
    
    // Deploy implementation
    const TokenTemplate = await hre.ethers.getContractFactory("TokenTemplate_v2_1_0");
    const implementation = await TokenTemplate.deploy();

    // Deploy proxy
    const ERC1967Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
    const initData = TokenTemplate.interface.encodeFunctionData("initialize", [
      "Test Token",
      "TEST",
      INITIAL_SUPPLY,
      MAX_SUPPLY,
      owner.address,
      true, // enableBlacklist
      true, // enableTimeLock
      PRESALE_RATE,
      MIN_CONTRIBUTION,
      MAX_CONTRIBUTION,
      PRESALE_CAP
    ]);

    const proxy = await ERC1967Proxy.deploy(
      implementation.target,
      initData
    );

    // Get token instance
    const token = TokenTemplate.attach(proxy.target) as unknown as PresaleTestContext["token"];

    context = {
      TokenTemplate,
      token,
      owner,
      addr1,
      addr2
    };
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await context.token.owner()).to.equal(context.owner.address);
    });

    it("Should set presale parameters correctly", async function () {
      expect(await context.token.presaleRate()).to.equal(PRESALE_RATE);
      expect(await context.token.minContribution()).to.equal(MIN_CONTRIBUTION);
      expect(await context.token.maxContribution()).to.equal(MAX_CONTRIBUTION);
      expect(await context.token.presaleCap()).to.equal(PRESALE_CAP);
    });

    it("Should have correct version info", async function () {
      expect(await context.token.VERSION()).to.equal("2.1.0");
    });
  });

  describe("Presale", function () {
    it("Should not allow contributions before presale starts", async function () {
      await expect(context.token.connect(context.addr1).contribute({ 
        value: MIN_CONTRIBUTION 
      })).to.be.revertedWith("Presale not active");
    });

    it("Should allow owner to start presale", async function () {
      await context.token.startPresale();
      expect(await context.token.presaleActive()).to.be.true;
    });

    it("Should accept valid contributions during presale", async function () {
      await context.token.startPresale();
      
      const contribution = ethers.parseEther("1"); // 1 ETH
      const expectedTokens = contribution * PRESALE_RATE;

      await context.token.connect(context.addr1).contribute({ value: contribution });
      
      expect(await context.token.presaleContributions(context.addr1.address))
        .to.equal(contribution);
      expect(await context.token.balanceOf(context.addr1.address))
        .to.equal(expectedTokens);
    });

    it("Should enforce min/max contribution limits", async function () {
      await context.token.startPresale();
      
      await expect(context.token.connect(context.addr1).contribute({ 
        value: ethers.parseEther("0.05") // Below min
      })).to.be.revertedWith("Below minimum contribution");

      await expect(context.token.connect(context.addr1).contribute({ 
        value: ethers.parseEther("11") // Above max
      })).to.be.revertedWith("Above maximum contribution");
    });

    it("Should enforce presale cap", async function () {
      await context.token.startPresale();
      
      // Try to contribute more than the cap
      await expect(context.token.connect(context.addr1).contribute({ 
        value: ethers.parseEther("101") 
      })).to.be.revertedWith("Above presale cap");
    });

    it("Should allow owner to finalize presale", async function () {
      await context.token.startPresale();
      
      const contribution = ethers.parseEther("1");
      await context.token.connect(context.addr1).contribute({ value: contribution });
      
      const balanceBefore = await hre.ethers.provider.getBalance(context.owner.address);
      await context.token.finalizePresale();
      const balanceAfter = await hre.ethers.provider.getBalance(context.owner.address);
      
      expect(await context.token.presaleActive()).to.be.false;
      expect(balanceAfter - balanceBefore).to.be.closeTo(contribution, ethers.parseEther("0.01"));
    });

    it("Should emit PresaleContribution event", async function () {
      await context.token.startPresale();
      const contribution = ethers.parseEther("1");
      
      await expect(context.token.connect(context.addr1).contribute({ value: contribution }))
        .to.emit(context.token, "PresaleContribution")
        .withArgs(context.addr1.address, contribution, contribution * PRESALE_RATE);
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      await context.token.transferOwnership(context.addr1.address);
      expect(await context.token.owner()).to.equal(context.addr1.address);
    });

    it("Should prevent non-owner from managing presale", async function () {
      await expect(context.token.connect(context.addr1).startPresale())
        .to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(context.token.connect(context.addr1).finalizePresale())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 