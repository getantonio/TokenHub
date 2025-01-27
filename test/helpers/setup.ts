import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import hre from "hardhat";
import "@nomicfoundation/hardhat-chai-matchers";

// Re-export what tests will need
const ethers = hre.ethers;

/**
 * Deploy a token template contract with proxy
 * @param version - Version of the token template to deploy (e.g. "v1_1_0" or "v2_1_0")
 * @param startTime - Optional start time for presale (v2 only)
 * @param endTime - Optional end time for presale (v2 only)
 * @returns Test context with deployed contracts and signers
 */
async function deployTokenTemplate(version: string, startTime?: number, endTime?: number) {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();
    
    // Deploy implementation
    const TokenTemplate = await hre.ethers.getContractFactory(`TokenTemplate_${version}`);
    const implementation = await TokenTemplate.deploy();

    // Deploy proxy
    const ERC1967Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
    
    // Initialize data based on version
    let initData;
    if (version.startsWith("v1")) {
        initData = TokenTemplate.interface.encodeFunctionData("initialize", [
            "Test Token",
            "TEST",
            hre.ethers.parseEther("1000000"), // 1M initial supply
            hre.ethers.parseEther("10000000"), // 10M max supply
            owner.address,
            true, // enableBlacklist
            true  // enableTimeLock
        ]);
    } else {
        // v2 initialization with presale parameters
        const now = Math.floor(Date.now() / 1000);
        initData = TokenTemplate.interface.encodeFunctionData("initialize", [
            "Test Token",
            "TEST",
            18, // decimals
            hre.ethers.parseEther("1000000"), // 1M initial supply
            owner.address,
            hre.ethers.parseEther("50"), // softCap
            hre.ethers.parseEther("100"), // hardCap
            hre.ethers.parseEther("0.1"), // minContribution
            hre.ethers.parseEther("10"), // maxContribution
            startTime || now, // Use provided startTime or current time
            endTime || (now + 7 * 24 * 60 * 60), // Use provided endTime or 1 week from now
            1000, // presaleRate
            false // whitelistEnabled
        ]);
    }

    const proxy = await ERC1967Proxy.deploy(
        implementation.target,
        initData
    );

    // Get token instance
    const token = TokenTemplate.attach(proxy.target);

    return {
        TokenTemplate,
        token,
        owner,
        addr1,
        addr2
    };
}

export {
    expect,
    ethers,
    deployTokenTemplate
}; 