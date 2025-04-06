const { ethers, network } = require("hardhat");

const CONTRACTS = {
  sepolia: {
    // V1 Contracts
    TokenFactory_v1: "0x1a28d5eef66AB135208ee7b33864236eEB804586",
    TokenTemplate_v1: "0x32B76c62016615Db119b46e70Bf753AD72035c49",
    
    // V2 Contracts
    TokenFactory_v2: "0xF619Ae83260bFa49ce8ae7dB13D9CebD104710C8",
    TokenTemplate_v2: "0x0A63Bc513E9d8D68D4c5f8A9B7aE7CA5678c9558",
    
    // V3 Contracts
    TokenFactory_v3_Enhanced: "0x5bB61aD9B5d57FCC4270318c9aBE7Bcd9b8604fB",
    TokenTemplate_v3_Enhanced: "0xB9e137E782F91B738F22Ed99e8cA512eE0ad646C",
    TokenFactory_v3_Enhanced_Fixed: "0x5Bb4F98ACD08eA28001a7e18d434993F5b69076E",
    TokenTemplate_v3_Enhanced_Fixed: "0xE4C3BCa3353abFcC9D011006c6b83115266723e0",
    
    // V4 Contracts
    TokenFactory_v4: "0xA06cF00fC2B455f92319cc4A6088B5B6Ccd2F10f",
    TokenTemplate_v4: "0xf1f85a76A0D54C6739a09d76376F351B57de535a",
    
    // DEX Listing Contracts
    DirectListingFactory: "0xF78Facc20c24735066B2c962B6Fa58d4234Ed8F3",
    TokenFactory_v2_DirectDEX_Fixed: "0x16BF74b4A81dd7508BAc7A99245AD90d80b6f4Ce"
  },
  opSepolia: {
    // V1 Contracts
    TokenFactory_v1: "0xfb3E54e9375cEc4C86c76E806DA97B4B8C8d655e",
    TokenTemplate_v1: "0x37FA01aD3A15D66bE1BEa5Fde9d02A76E73CC426",
    
    // V2 Contracts
    TokenFactory_v2: "0x93375d26208EAf8a3EcaA420F81315AdC5bFfff4",
    TokenTemplate_v2: "0x70BA870A2A8786F513C60FA29B70e8f5118364E1",
    
    // V3 Contracts
    TokenFactory_v3_Enhanced: "0x6b973581595ce8C57f03Bc2384c20f233d45E2D6",
    TokenTemplate_v3_Enhanced: "0xDbA4b8Bb92Da2E2cd0bA90D5bfB6C9C6932954ED"
  },
  arbitrumSepolia: {
    // V1 Contracts
    TokenFactory_v1: "0x9209DfFAddB8a8bfe4ffaa2b79537461E478386d",
    TokenTemplate_v1: "0x49449f725C6a04c842DE4923A68b83BB392923d4",
    
    // V2 Contracts
    TokenFactory_v2: "0x0131c96d67A6B096a73307339865232335c9283B",
    TokenTemplate_v2: "0x0417D4503304C054a55d1EEDb9d378d8972aBa16",
    
    // V3 Contracts
    TokenFactory_v3_Enhanced: "0xCBa48f15BecdAC1eAF709Ce65c8FEFe436513e07",
    TokenTemplate_v3_Enhanced: "0x88Da63C8eF2De9646Be21b0f034BC0F3745e636c"
  },
  polygonAmoy: {
    // V1 Contracts
    TokenFactory_v1: "0xAC49A5f87D1b1c9df1885B90B911BdfdE40c2c36",
    TokenTemplate_v1: "0xF16f9D7C596ada8D2bB3bFc4d8a12b0329A330d5",
    
    // V2 Contracts
    TokenFactory_v2: "0xBF0349881D0C184E55478C363c6a1ef56Ad6dA6C",
    TokenTemplate_v2: "0x71A0eD492B5Fc1edfacf8BE9E755F3dbaf235c0D",
    
    // V3 Contracts
    TokenFactory_v3_Enhanced: "0xc9dE01F826649bbB1A54d2A00Ce91D046791AdE1",
    TokenTemplate_v3_Enhanced: "0xcBF2E7F7D44Bf9A0eA86259005994D8B3Ebf7432",
    
    // V4 Contracts
    TokenFactory_v4: "0x6D5ca5c96A7bC2a1A868EF5D0c7b97DdcB37B7bA",
    TokenTemplate_v4: "0xc0ed0d564F0FeCD6811468AE5f801F7aA5664BC8",
    TokenImplementation_v4: "0x9b5956D020E7c8C4D563D41851928BCA55A182a6",
    TokenBeacon_v4: "0xc0ed0d564F0FeCD6811468AE5f801F7aA5664BC8",
    TokenFactory_v4_Enhanced: "0x152B75eCF75B5ADF93d70aD1E20D44f315e428F6",
    TokenFactory_v4_Simple: "0x2AeEeAc326c919fBa92b9CA4d68A13772bAbb493",
    TokenFactory_v4_WithLiquidity: "0xbBa30132B6A6EbCA53c6dEbEfaFdBF9D615b24d7",
    TokenFactory_v4_Distribution: "0x9d2C57e5390D8381E7b8F64d6381cD97c298680c",
    
    // DEX Listing Contracts
    DirectListingFactory: "0x1141c7ec96eBEAB7270dBdbc00B2AcE9E35d1bDb",
    DirectListingTemplate: "0x1446940931d93C19590AB62cc123d521286D5751",
    TokenFactory_v2_DirectDEX_Fixed: "0xE1469497243ce0A7f5d26f81c34E9eFA5975569b"
  },
  bscTestnet: {
    // V1 Contracts
    TokenFactory_v1: "0x14cA8710278F31803fDA2D6363d7Df8c2710b6aa",
    TokenTemplate_v1: "0x70D689a85bFcC2cf3CAb41596B751BC177102b49",
    
    // V2 Contracts
    TokenFactory_v2: "0xd02013450B2fc3CBa06f723EB59D500104f2ECD9",
    TokenTemplate_v2: "0x9496f1562ed047e5a8dDDd92b684C67D1A184181",
    
    // V3 Contracts
    TokenFactory_v3_Enhanced: "0xFf86c158F0cD14b1a2d18AEf8038527f71c4383b",
    TokenTemplate_v3_Enhanced: "0x2c719159C38c565A282918BCc94aa1a5bC591009",
    
    // V4 Contracts
    TokenFactory_v4: "0xB5d3f3C533b7F241BC8d0031788B6daFc0762Ee6",
    TokenTemplate_v4: "0xF8ED5C2f329d3281Ef05D886b43385ae1fcB96Cc",
    
    // DEX Listing Contracts
    DirectListingFactory: "0x1b4EEF44c30b5C957aF4559aeEB8A5bF3287Cd28",
    TokenFactory_v2_DirectDEX_Fixed: "0xE1469497243ce0A7f5d26f81c34E9eFA5975569b"
  }
};

const NEW_OWNER = "0x10C8c279c6b381156733ec160A89Abb260bfcf0C";
const CURRENT_OWNER = "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F";

async function transferOwnership() {
  // Get the network from Hardhat
  const networkName = network.name;
  console.log(`\nProcessing network: ${networkName}`);
  
  const contracts = CONTRACTS[networkName];
  if (!contracts) {
    console.error(`No contracts found for network: ${networkName}`);
    return;
  }
  
  for (const [name, address] of Object.entries(contracts)) {
    try {
      console.log(`\nChecking ${name} at ${address}`);
      
      // Try standard Ownable first
      let contract = await ethers.getContractAt("Ownable", address);
      
      // Check current owner
      let owner = await contract.owner();
      console.log(`Current owner: ${owner}`);
      
      if (owner.toLowerCase() === CURRENT_OWNER.toLowerCase()) {
        console.log(`Transferring ownership of ${name} to ${NEW_OWNER}`);
        
        // Transfer ownership
        const tx = await contract.transferOwnership(NEW_OWNER);
        await tx.wait();
        
        // Verify new owner
        const newOwner = await contract.owner();
        console.log(`New owner: ${newOwner}`);
        
        if (newOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
          console.log(`Successfully transferred ownership of ${name}`);
        } else {
          // Try OwnableUpgradeable if standard Ownable failed
          contract = await ethers.getContractAt("OwnableUpgradeable", address);
          owner = await contract.owner();
          
          if (owner.toLowerCase() === CURRENT_OWNER.toLowerCase()) {
            console.log(`Retrying with OwnableUpgradeable for ${name}`);
            
            // Transfer ownership
            const tx = await contract.transferOwnership(NEW_OWNER);
            await tx.wait();
            
            // Verify new owner
            const newOwner = await contract.owner();
            console.log(`New owner: ${newOwner}`);
            
            if (newOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
              console.log(`Successfully transferred ownership of ${name}`);
            } else {
              console.error(`Failed to verify new owner for ${name}`);
            }
          } else {
            console.error(`Failed to verify new owner for ${name}`);
          }
        }
      } else {
        console.log(`Contract ${name} is not owned by the compromised address`);
      }
    } catch (error) {
      console.error(`Error processing ${name}:`, error.message);
    }
  }
}

transferOwnership()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 