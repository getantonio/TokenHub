const { run } = require("hardhat");

async function main() {
  const tokenAddresses = [
    "0xD3d40f9DcD0386a4D3D1804cd6a06799022e7389",
    "0xa75a2A16998b95E19504941D91c2ED8c247e51bD",
    "0xCf20E0935d561BaA7D0fd9f31ce7784ea8F20929"
  ];

  for (const address of tokenAddresses) {
    console.log(`Verifying token at ${address}...`);
    try {
      await run("verify:verify", {
        address: address,
        contract: "contracts/TokenTemplate_v1.sol:TokenTemplate_v1"
      });
      console.log("Verification successful!");
    } catch (error) {
      console.error(`Error verifying ${address}:`, error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 