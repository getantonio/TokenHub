import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { deployTokenTemplate } from "./helpers/setup";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TokenTemplate_v2.1.0", function () {
  let token: any;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let startTime: number;
  let endTime: number;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 18); // 1M tokens
  const SOFT_CAP = ethers.parseEther("50"); // 50 ETH
  const HARD_CAP = ethers.parseEther("100"); // 100 ETH
  const MIN_CONTRIBUTION = ethers.parseEther("0.1"); // 0.1 ETH
  const MAX_CONTRIBUTION = ethers.parseEther("10"); // 10 ETH
  const PRESALE_RATE = 1000; // 1000 tokens per ETH

  beforeEach(async function () {
    // Get current block timestamp
    const latestTime = await time.latest();
    
    // Set presale times
    startTime = latestTime + 3600; // Start in 1 hour
    endTime = startTime + 86400; // End 24 hours after start
    
    // Deploy token with custom timestamps
    const context = await deployTokenTemplate("v2_1_0", startTime, endTime);
    token = context.token;
    owner = context.owner;
    addr1 = context.addr1;
    addr2 = context.addr2;
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should set presale parameters correctly", async function () {
      const presaleStatus = await token.getPresaleStatus();
      expect(presaleStatus.softCap).to.equal(ethers.parseEther("50"));
      expect(presaleStatus.hardCap).to.equal(ethers.parseEther("100"));
      expect(presaleStatus.minContribution).to.equal(ethers.parseEther("0.1"));
      expect(presaleStatus.maxContribution).to.equal(ethers.parseEther("10"));
      expect(presaleStatus.presaleRate).to.equal(1000);
      expect(presaleStatus.whitelistEnabled).to.equal(false);
      expect(presaleStatus.finalized).to.equal(false);
      expect(presaleStatus.totalContributed).to.equal(0);
      expect(presaleStatus.startTime).to.equal(startTime);
      expect(presaleStatus.endTime).to.equal(endTime);
    });

    it("Should have correct version info", async function () {
      expect(await token.VERSION()).to.equal("2.1.0");
    });
  });

  describe("Presale", function () {
    it("Should not allow contributions before presale starts", async function () {
      // Time is before startTime
      await expect(
        token.connect(addr1).contribute({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("Presale not started");
    });

    it("Should allow valid contributions during presale", async function () {
      // Move time to start of presale
      await time.increaseTo(startTime + 1);

      // Contribute 1 ETH
      const contribution = ethers.parseEther("1");
      await expect(
        token.connect(addr1).contribute({ value: contribution })
      ).to.emit(token, "ContributionReceived")
       .withArgs(addr1.address, contribution);

      // Check contribution was recorded
      const userContribution = await token.getContribution(addr1.address);
      expect(userContribution).to.equal(contribution);
    });

    it("Should enforce presale cap", async function () {
      // Move time to start of presale
      await time.increaseTo(startTime + 1);

      // First contribution: 10 ETH from addr1 (max allowed)
      await token.connect(addr1).contribute({ 
        value: ethers.parseEther("10") 
      });

      // Second contribution: 10 ETH from addr2
      await token.connect(addr2).contribute({ 
        value: ethers.parseEther("10") 
      });

      // Third contribution: 10 ETH from addr1 (should fail as it exceeds max per address)
      await expect(
        token.connect(addr1).contribute({ 
          value: ethers.parseEther("10") 
        })
      ).to.be.revertedWith("Would exceed max contribution");
    });

    it("Should allow owner to finalize presale after soft cap is reached", async function () {
      // Move time to start of presale
      await time.increaseTo(startTime + 1);

      // Get signers for multiple contributors
      const signers = await ethers.getSigners();
      const contributors = signers.slice(2, 7); // Use 5 different contributors

      // Each contributor contributes 10 ETH to reach soft cap (50 ETH)
      for(const contributor of contributors) {
        await token.connect(contributor).contribute({ 
          value: ethers.parseEther("10") 
        });
      }

      // Move time past end time
      await time.increaseTo(endTime + 1);

      // Finalize presale
      await expect(token.finalize())
        .to.emit(token, "PresaleFinalized");
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      await token.transferOwnership(addr1.address);
      expect(await token.owner()).to.equal(addr1.address);
    });

    it("Should prevent non-owner from managing presale", async function () {
      await expect(
        token.connect(addr1).finalize()
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(addr1.address);
    });
  });
}); 