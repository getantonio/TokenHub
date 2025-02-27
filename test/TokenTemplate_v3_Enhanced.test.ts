const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenTemplate_v3_Enhanced", function () {
  let factory;
  let owner;
  let wallet1;
  let wallet2;
  let wallet3;
  let deploymentFee;

  // Router addresses for different networks
  const ROUTER_ADDRESSES = {
    mainnet: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    sepolia: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"
  };

  beforeEach(async function () {
    // Get signers
    [owner, wallet1, wallet2, wallet3] = await ethers.getSigners();

    // Get router address based on network
    const networkName = hre.network.name;
    const routerAddress = ROUTER_ADDRESSES[networkName] || ROUTER_ADDRESSES.sepolia;
    console.log("Using router address:", routerAddress, "for network:", networkName);

    // Deploy factory contract
    const Factory = await ethers.getContractFactory("TokenFactory_v3_Enhanced");
    // Deploy with router address, deployment fee, and fee recipient
    factory = await Factory.deploy(
      routerAddress,
      ethers.parseEther("0.1"), // Deployment fee of 0.1 ETH
      owner.address // Fee recipient
    );
    await factory.waitForDeployment();

    // Get deployment fee
    deploymentFee = await factory.deploymentFee();
  });

  it("should create a token with correct allocations", async function () {
    const tokenParams = {
      name: "Anthony",
      symbol: "ANT",
      initialSupply: ethers.parseEther("1000000"), // 1M tokens
      maxSupply: ethers.parseEther("2000000"), // 2M tokens
      owner: await owner.getAddress(),
      enableBlacklist: false,
      enableTimeLock: false,
      presaleEnabled: false,
      maxActivePresales: 0,
      presaleRate: ethers.parseEther("0"),
      softCap: ethers.parseEther("0"),
      hardCap: ethers.parseEther("0"),
      minContribution: ethers.parseEther("0"),
      maxContribution: ethers.parseEther("0"),
      startTime: BigInt(Math.floor(Date.now() / 1000)),
      endTime: BigInt(Math.floor(Date.now() / 1000) + 86400), // 24 hours from now
      presalePercentage: 0,
      liquidityPercentage: 60,
      liquidityLockDuration: BigInt(365 * 24 * 60 * 60), // 1 year
      walletAllocations: [
        {
          wallet: await wallet1.getAddress(),
          percentage: 20,
          vestingEnabled: false,
          vestingDuration: BigInt(0),
          cliffDuration: BigInt(0),
          vestingStartTime: BigInt(0)
        },
        {
          wallet: await wallet2.getAddress(),
          percentage: 10,
          vestingEnabled: false,
          vestingDuration: BigInt(0),
          cliffDuration: BigInt(0),
          vestingStartTime: BigInt(0)
        },
        {
          wallet: await wallet3.getAddress(),
          percentage: 10,
          vestingEnabled: false,
          vestingDuration: BigInt(0),
          cliffDuration: BigInt(0),
          vestingStartTime: BigInt(0)
        }
      ]
    };

    // Create token
    const tx = await factory.createToken(tokenParams, { value: deploymentFee });
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    // Get token address from event
    const tokenCreatedEvent = receipt.logs.find(log => {
      try {
        const parsedLog = factory.interface.parseLog(log);
        return parsedLog?.name === "TokenCreated";
      } catch {
        return false;
      }
    });
    if (!tokenCreatedEvent) throw new Error("TokenCreated event not found");
    
    const parsedEvent = factory.interface.parseLog(tokenCreatedEvent);
    if (!parsedEvent) throw new Error("Failed to parse event");
    
    const tokenAddress = parsedEvent.args[0];
    if (!tokenAddress) throw new Error("Token address not found in event");

    // Get token instance
    const token = await ethers.getContractAt("TokenTemplate_v3_Enhanced", tokenAddress);

    // Verify token properties
    expect(await token.name()).to.equal("Anthony");
    expect(await token.symbol()).to.equal("ANT");
    expect(await token.totalSupply()).to.equal(tokenParams.initialSupply);
    expect(await token.maxSupply()).to.equal(tokenParams.maxSupply);

    // Verify wallet balances
    const expectedWallet1Balance = tokenParams.initialSupply * BigInt(20) / BigInt(100);
    const expectedWallet2Balance = tokenParams.initialSupply * BigInt(10) / BigInt(100);
    const expectedWallet3Balance = tokenParams.initialSupply * BigInt(10) / BigInt(100);

    expect(await token.balanceOf(await wallet1.getAddress())).to.equal(expectedWallet1Balance);
    expect(await token.balanceOf(await wallet2.getAddress())).to.equal(expectedWallet2Balance);
    expect(await token.balanceOf(await wallet3.getAddress())).to.equal(expectedWallet3Balance);

    // Verify liquidity allocation
    const expectedLiquidityBalance = tokenParams.initialSupply * BigInt(60) / BigInt(100);
    // The liquidity tokens are held by the contract itself until added to liquidity
    expect(await token.balanceOf(tokenAddress)).to.equal(expectedLiquidityBalance);
    expect(await token.liquidityAllocation()).to.equal(expectedLiquidityBalance);
    expect(await token.remainingLiquidityAllocation()).to.equal(expectedLiquidityBalance);
  });
}); 