import { ethers } from "hardhat";

async function main() {
    console.log("Deploying test contracts...");

    // Deploy test factory
    const TestFactory = await ethers.getContractFactory("TestFactory");
    const factory = await TestFactory.deploy();
    await factory.waitForDeployment();
    console.log("TestFactory deployed to:", await factory.getAddress());

    // Create a test token
    const tx = await factory.createToken(
        "Test Token",
        "TEST",
        ethers.parseEther("1000000") // 1M tokens
    );
    await tx.wait();
    console.log("Test token created");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 