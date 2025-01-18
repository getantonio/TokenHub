import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TokenFactory, BaseToken } from "../typechain-types";

describe("TokenFactory", function () {
  let tokenFactory: TokenFactory;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let teamWallet: SignerWithAddress;

  beforeEach(async function () {
    [owner, user, teamWallet] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    tokenFactory = await TokenFactory.deploy(ethers.utils.parseEther("0.1")); // 0.1 ETH creation fee
    await tokenFactory.deployed();
  });

  describe("Token Creation", function () {
    it("should create a new token with basic features", async function () {
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
        maxSupply: ethers.utils.parseEther("1000000"),
        initialSupply: ethers.utils.parseEther("1000000"),
        tokenPrice: ethers.utils.parseEther("0.0001"),
        maxTransferAmount: 0,
        cooldownTime: 0,
        transfersEnabled: true,
        antiBot: false,
        teamVestingDuration: 12, // 12 months
        teamVestingCliff: 1, // 1 month
        teamAllocation: 10, // 10%
        teamWallet: teamWallet.address,
      };

      // Create token
      await tokenFactory.connect(user).createToken(tokenParams, {
        value: ethers.utils.parseEther("0.1"), // Creation fee
      });

      // Get the created token address
      const tokenAddress = await tokenFactory.getTokenByOwner(user.address);
      const token = await ethers.getContractAt("BaseToken", tokenAddress);

      // Verify token parameters
      expect(await token.name()).to.equal(tokenParams.name);
      expect(await token.symbol()).to.equal(tokenParams.symbol);
      expect(await token.totalSupply()).to.equal(tokenParams.initialSupply);
      expect(await token.maxSupply()).to.equal(tokenParams.maxSupply);
    });

    it("should enforce vesting for team allocation", async function () {
      // Token creation parameters with vesting
      const tokenParams = {
        // ... same parameters as above
        teamVestingDuration: 12,
        teamVestingCliff: 3,
        teamAllocation: 20,
        teamWallet: teamWallet.address,
      };

      await tokenFactory.connect(user).createToken(tokenParams, {
        value: ethers.utils.parseEther("0.1"),
      });

      const tokenAddress = await tokenFactory.getTokenByOwner(user.address);
      const token = await ethers.getContractAt("BaseToken", tokenAddress);

      // Try to transfer team allocation before cliff
      await expect(
        token.connect(teamWallet).transfer(user.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("Tokens are locked");

      // Fast forward past cliff period
      await ethers.provider.send("evm_increaseTime", [3 * 30 * 24 * 60 * 60]); // 3 months
      await ethers.provider.send("evm_mine", []);

      // Should be able to transfer partial amount
      const transferAmount = ethers.utils.parseEther("1");
      await expect(
        token.connect(teamWallet).transfer(user.address, transferAmount)
      ).to.not.be.reverted;
    });

    it("should enforce transfer limits when enabled", async function () {
      const tokenParams = {
        // ... basic parameters
        maxTransferAmount: ethers.utils.parseEther("1000"),
        transfersEnabled: true,
      };

      await tokenFactory.connect(user).createToken(tokenParams, {
        value: ethers.utils.parseEther("0.1"),
      });

      const tokenAddress = await tokenFactory.getTokenByOwner(user.address);
      const token = await ethers.getContractAt("BaseToken", tokenAddress);

      // Try to transfer more than limit
      await expect(
        token.transfer(user.address, ethers.utils.parseEther("1001"))
      ).to.be.revertedWith("Transfer amount exceeds limit");
    });

    it("should enforce cooldown period", async function () {
      const tokenParams = {
        // ... basic parameters
        cooldownTime: 3600, // 1 hour cooldown
      };

      await tokenFactory.connect(user).createToken(tokenParams, {
        value: ethers.utils.parseEther("0.1"),
      });

      const tokenAddress = await tokenFactory.getTokenByOwner(user.address);
      const token = await ethers.getContractAt("BaseToken", tokenAddress);

      // First transfer should work
      await token.transfer(user.address, ethers.utils.parseEther("1"));

      // Second transfer should fail within cooldown
      await expect(
        token.transfer(user.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("Transfer cooldown active");

      // Fast forward past cooldown
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      // Transfer should now work
      await expect(
        token.transfer(user.address, ethers.utils.parseEther("1"))
      ).to.not.be.reverted;
    });
  });

  describe("Factory Management", function () {
    it("should allow owner to update creation fee", async function () {
      const newFee = ethers.utils.parseEther("0.2");
      await tokenFactory.connect(owner).setCreationFee(newFee);
      expect(await tokenFactory.creationFee()).to.equal(newFee);
    });

    it("should allow owner to withdraw fees", async function () {
      // Create a token to generate fees
      await tokenFactory.connect(user).createToken(
        {
          // ... basic parameters
        },
        { value: ethers.utils.parseEther("0.1") }
      );

      const initialBalance = await owner.getBalance();
      await tokenFactory.connect(owner).withdrawFees();
      const finalBalance = await owner.getBalance();

      expect(finalBalance.sub(initialBalance)).to.be.closeTo(
        ethers.utils.parseEther("0.1"),
        ethers.utils.parseEther("0.01") // Account for gas costs
      );
    });
  });
}); 