import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { TokenV1 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Token Upgrades", function () {
  let token: TokenV1;
  let owner: SignerWithAddress;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

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

  it("Should only allow owner to upgrade", async function () {
    const [_, nonOwner] = await ethers.getSigners();
    const TokenV1 = await ethers.getContractFactory("TokenV1");
    
    await expect(
      upgrades.upgradeProxy(await token.getAddress(), TokenV1.connect(nonOwner))
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });
}); 