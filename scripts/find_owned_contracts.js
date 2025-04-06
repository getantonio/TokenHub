const { ethers } = require("hardhat");

async function main() {
    const COMPROMISED_ADDRESS = "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F";
    
    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log("Using signer:", signer.address);

    // List of contracts to check (from .env.local)
    const contracts = [
        // V1 Contracts
        "0x1a28d5eef66AB135208ee7b33864236eEB804586", // SEPOLIA_FACTORY_V1
        "0x32B76c62016615Db119b46e70Bf753AD72035c49", // SEPOLIA_TEMPLATE_V1
        "0xfb3E54e9375cEc4C86c76E806DA97B4B8C8d655e", // OPSEPOLIA_FACTORY_V1
        "0x37FA01aD3A15D66bE1BEa5Fde9d02A76E73CC426", // OPSEPOLIA_TEMPLATE_V1
        "0x9209DfFAddB8a8bfe4ffaa2b79537461E478386d", // ARBITRUMSEPOLIA_FACTORY_V1
        "0x49449f725C6a04c842DE4923A68b83BB392923d4", // ARBITRUMSEPOLIA_TEMPLATE_V1
        "0xAC49A5f87D1b1c9df1885B90B911BdfdE40c2c36", // POLYGONAMOY_FACTORY_V1
        "0xF16f9D7C596ada8D2bB3bFc4d8a12b0329A330d5", // POLYGONAMOY_TEMPLATE_V1
        "0x14cA8710278F31803fDA2D6363d7Df8c2710b6aa", // BSCTESTNET_FACTORY_V1
        "0x70D689a85bFcC2cf3CAb41596B751BC177102b49", // BSCTESTNET_TEMPLATE_V1

        // V2 Contracts
        "0xF619Ae83260bFa49ce8ae7dB13D9CebD104710C8", // SEPOLIA_FACTORY_V2
        "0x0A63Bc513E9d8D68D4c5f8A9B7aE7CA5678c9558", // SEPOLIA_TEMPLATE_V2
        "0x93375d26208EAf8a3EcaA420F81315AdC5bFfff4", // OPSEPOLIA_FACTORY_V2
        "0x70BA870A2A8786F513C60FA29B70e8f5118364E1", // OPSEPOLIA_TEMPLATE_V2
        "0x0131c96d67A6B096a73307339865232335c9283B", // ARBITRUMSEPOLIA_FACTORY_V2
        "0x0417D4503304C054a55d1EEDb9d378d8972aBa16", // ARBITRUMSEPOLIA_TEMPLATE_V2
        "0xBF0349881D0C184E55478C363c6a1ef56Ad6dA6C", // POLYGONAMOY_FACTORY_V2
        "0x71A0eD492B5Fc1edfacf8BE9E755F3dbaf235c0D", // POLYGONAMOY_TEMPLATE_V2
        "0xd02013450B2fc3CBa06f723EB59D500104f2ECD9", // BSCTESTNET_FACTORY_V2
        "0x9496f1562ed047e5a8dDDd92b684C67D1A184181", // BSCTESTNET_TEMPLATE_V2

        // V3 Contracts
        "0x5bB61aD9B5d57FCC4270318c9aBE7Bcd9b8604fB", // SEPOLIA_FACTORY_V3
        "0xB9e137E782F91B738F22Ed99e8cA512eE0ad646C", // SEPOLIA_TEMPLATE_V3
        "0x5Bb4F98ACD08eA28001a7e18d434993F5b69076E", // SEPOLIA_FACTORY_V9-3
        "0xE4C3BCa3353abFcC9D011006c6b83115266723e0", // SEPOLIA_TEMPLATE_V9-3
        "0x6b973581595ce8C57f03Bc2384c20f233d45E2D6", // OPSEPOLIA_FACTORY_V3
        "0xDbA4b8Bb92Da2E2cd0bA90D5bfB6C9C6932954ED", // OPSEPOLIA_TEMPLATE_V3
        "0xCBa48f15BecdAC1eAF709Ce65c8FEFe436513e07", // ARBITRUMSEPOLIA_FACTORY_V3
        "0x88Da63C8eF2De9646Be21b0f034BC0F3745e636c", // ARBITRUMSEPOLIA_TEMPLATE_V3
        "0xc9dE01F826649bbB1A54d2A00Ce91D046791AdE1", // POLYGONAMOY_FACTORY_V3
        "0xcBF2E7F7D44Bf9A0eA86259005994D8B3Ebf7432"  // POLYGONAMOY_TEMPLATE_V3
    ];

    console.log("\nChecking ownership of contracts...");
    
    for (const contractAddress of contracts) {
        try {
            const contract = await ethers.getContractAt("Ownable", contractAddress);
            const owner = await contract.owner();
            
            if (owner.toLowerCase() === COMPROMISED_ADDRESS.toLowerCase()) {
                console.log(`\nContract ${contractAddress} is owned by compromised address`);
                console.log("Current owner:", owner);
            }
        } catch (error) {
            console.error(`Error checking contract ${contractAddress}:`, error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 