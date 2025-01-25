import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { TokenV1 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TokenV1", function () {
  let token: TokenV1;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const TokenV1 = await ethers.getContractFactory("TokenV1");
    token = await upgrades.deployProxy(TokenV1, [
      "Test Token",
      "TEST",
      ethers.parseEther("1000000")
    ], {
      kind: 'uups',
      initializer: 'initialize',
    }) as unknown as TokenV1;

    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(await owner.getAddress());
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await token.balanceOf(await owner.getAddress());
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });

    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("Test Token");
      expect(await token.symbol()).to.equal("TEST");
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1
      await token.transfer(await addr1.getAddress(), ethers.parseEther("50"));
      expect(await token.balanceOf(await addr1.getAddress())).to.equal(ethers.parseEther("50"));
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(await owner.getAddress());
      await expect(
        token.connect(addr1).transfer(await owner.getAddress(), 1)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
      expect(await token.balanceOf(await owner.getAddress())).to.equal(initialOwnerBalance);
    });
  });
}); 