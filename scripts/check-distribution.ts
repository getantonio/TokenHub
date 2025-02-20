const { ethers } = require('ethers');

const TOKEN_V3_ABI = [
  // Basic ERC20 functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function owner() view returns (address)',
  // V3 specific functions
  'function presaleInfo() view returns (tuple(uint256 softCap, uint256 hardCap, uint256 minContribution, uint256 maxContribution, uint256 startTime, uint256 endTime, uint256 presaleRate, bool whitelistEnabled, bool finalized, uint256 totalContributed))',
  'function getContributors() view returns (address[])',
  'function getContributorCount() view returns (uint256)',
  'function presaleContributorTokens(address) view returns (uint256)',
  'function contributions(address) view returns (uint256)',
  'function vestingSchedules(address) view returns (tuple(uint256 totalAmount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, uint256 releasedAmount, bool revocable, bool revoked))',
  'function hasVestingSchedule(address) view returns (bool)',
  'function maxSupply() view returns (uint256)',
  'function totalPresaleTokensDistributed() view returns (uint256)',
  'function paused() view returns (bool)'
];

async function main() {
  const TOKEN_ADDRESS = '0x1103306DA115Efa6b54A82eF486c0CcE03394c9E';
  
  if (!TOKEN_ADDRESS) {
    console.error('Please provide a token address');
    process.exit(1);
  }

  // Connect to provider
  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/de082d8afc854286a7bdc56f2895fc67');
  const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_V3_ABI, provider);

  try {
    // Get basic token info
    const [name, symbol, decimals, totalSupply, owner, maxSupply, paused] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.owner(),
      token.maxSupply(),
      token.paused()
    ]);

    console.log('\nToken Information:');
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('Decimals:', decimals);
    console.log('Total Supply:', ethers.formatEther(totalSupply));
    console.log('Max Supply:', ethers.formatEther(maxSupply));
    console.log('Owner:', owner);
    console.log('Status:', paused ? 'Paused' : 'Active');

    // Get presale info
    try {
      const presaleInfo = await token.presaleInfo();
      console.log('\nPresale Information:');
      console.log('Soft Cap:', ethers.formatEther(presaleInfo.softCap), 'ETH');
      console.log('Hard Cap:', ethers.formatEther(presaleInfo.hardCap), 'ETH');
      console.log('Min Contribution:', ethers.formatEther(presaleInfo.minContribution), 'ETH');
      console.log('Max Contribution:', ethers.formatEther(presaleInfo.maxContribution), 'ETH');
      console.log('Presale Rate:', presaleInfo.presaleRate.toString(), 'tokens per ETH');
      console.log('Start Time:', new Date(Number(presaleInfo.startTime) * 1000).toLocaleString());
      console.log('End Time:', new Date(Number(presaleInfo.endTime) * 1000).toLocaleString());
      console.log('Whitelist Enabled:', presaleInfo.whitelistEnabled);
      console.log('Finalized:', presaleInfo.finalized);
      console.log('Total Contributed:', ethers.formatEther(presaleInfo.totalContributed), 'ETH');

      // Get contributor info
      const [contributors, contributorCount, totalPresaleTokens] = await Promise.all([
        token.getContributors(),
        token.getContributorCount(),
        token.totalPresaleTokensDistributed()
      ]);

      console.log('\nContributor Information:');
      console.log('Total Contributors:', contributorCount.toString());
      console.log('Total Presale Tokens Distributed:', ethers.formatEther(totalPresaleTokens));

      // Get detailed contributor info
      if (contributors.length > 0) {
        console.log('\nContributor Details:');
        for (const contributor of contributors) {
          const [contribution, tokens] = await Promise.all([
            token.contributions(contributor),
            token.presaleContributorTokens(contributor)
          ]);
          console.log(`${contributor}:`);
          console.log(`  Contribution: ${ethers.formatEther(contribution)} ETH`);
          console.log(`  Tokens: ${ethers.formatEther(tokens)} ${symbol}`);
        }
      }
    } catch (error) {
      console.log('\nNo presale info available');
    }

    // Check for vesting schedules
    try {
      const hasVesting = await token.hasVestingSchedule(owner);
      if (hasVesting) {
        const vestingInfo = await token.vestingSchedules(owner);
        console.log('\nVesting Schedule (Owner):');
        console.log('Total Amount:', ethers.formatEther(vestingInfo.totalAmount));
        console.log('Start Time:', new Date(Number(vestingInfo.startTime) * 1000).toLocaleString());
        console.log('Cliff Duration:', vestingInfo.cliffDuration.toString(), 'seconds');
        console.log('Vesting Duration:', vestingInfo.vestingDuration.toString(), 'seconds');
        console.log('Released Amount:', ethers.formatEther(vestingInfo.releasedAmount));
        console.log('Revocable:', vestingInfo.revocable);
        console.log('Revoked:', vestingInfo.revoked);
      }
    } catch (error) {
      console.log('\nNo vesting info available');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error); 