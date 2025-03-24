import { NextPage } from 'next';
import Head from 'next/head';

const AboutPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>About TokenHub.dev</title>
        <meta name="description" content="Learn about TokenHub.dev – The Future of Token Creation, DeFi, and NFTs" />
      </Head>
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-6">TokenHub.dev – The Future of Token Creation, DeFi, and NFTs</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-xl mb-8">
              A new world order where launching your own cryptocurrency, DeFi lending platform, or NFT collection is as simple as a few clicks—where you don't need a team of blockchain developers or a massive budget to bring your vision to life. That world exists today, and it's called TokenHub.dev.
            </p>

            <div className="bg-gradient-to-b from-blue-900/20 to-transparent rounded-xl p-6 mb-8 border border-blue-500/20">
              <h2 className="text-3xl font-bold text-white mb-4">Continuous Innovation</h2>
              <p className="text-lg mb-6">
                At TokenHub.dev, we're constantly pushing the boundaries of what's possible in token creation and DeFi. Our upcoming releases include enhanced DeFi capabilities, advanced NFT features, and groundbreaking security implementations.
              </p>
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-400/20">
                <h3 className="text-xl font-bold text-blue-400 mb-2">Coming Soon</h3>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <span className="text-blue-400 mr-2">🔥</span>
                    <span>Advanced DeFi Integration Platform</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-400 mr-2">🔥</span>
                    <span>Next-Generation NFT Factory</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-400 mr-2">🔥</span>
                    <span>Enhanced Security Features</span>
                  </li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6">TokenHub.dev Factory Versions</h2>
            
            <div className="space-y-8">
              {/* Factory V5 */}
              <div className="bg-black/20 rounded-lg p-6 border border-blue-500/20">
                <h3 className="text-2xl font-bold text-blue-400 mb-4">Factory V5 – Synthetic Token Creation Suite</h3>
                <p className="text-lg mb-4">
                  Our most sophisticated factory for creating synthetic tokens pegged to real-world assets. Perfect for building stablecoins, commodity-backed tokens, and synthetic derivatives.
                </p>
                <ul className="list-none space-y-2 my-4">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">⚡</span>
                    <span>Advanced Price Oracle Integration</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">⚡</span>
                    <span>Multi-Collateral Backing System</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">⚡</span>
                    <span>Automated Rebalancing Mechanisms</span>
                  </li>
                </ul>
              </div>

              {/* Factory V4 */}
              <div className="bg-black/20 rounded-lg p-6 border border-purple-500/20">
                <h3 className="text-2xl font-bold text-purple-400 mb-4">Factory V4 – Advanced Token Creation Suite</h3>
                <p className="text-lg mb-4">
                  Our feature-rich token factory for creating sophisticated tokenomics with advanced trading mechanics and holder benefits.
                </p>
                <ul className="list-none space-y-2 my-4">
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">⚡</span>
                    <span>Dynamic Fee System</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">⚡</span>
                    <span>Automated Liquidity Generation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">⚡</span>
                    <span>Holder Rewards & Redistribution</span>
                  </li>
                </ul>
              </div>

              {/* Factory V3 */}
              <div className="bg-black/20 rounded-lg p-6 border border-green-500/20">
                <h3 className="text-2xl font-bold text-green-400 mb-4">Factory V3 – Presale & Vesting Platform</h3>
                <p className="text-lg mb-4">
                  Comprehensive solution for managing token presales, investor allocations, and vesting schedules with unprecedented flexibility.
                </p>
                <ul className="list-none space-y-2 my-4">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">⚡</span>
                    <span>Customizable Vesting Schedules</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">⚡</span>
                    <span>Multi-Round Presale Support</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">⚡</span>
                    <span>Automated Distribution System</span>
                  </li>
                </ul>
              </div>

              {/* Factory V2 */}
              <div className="bg-black/20 rounded-lg p-6 border border-yellow-500/20">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4">Factory V2 – Advanced Token Factory</h3>
                <p className="text-lg mb-4">
                  Enhanced token creation platform with built-in liquidity management and reward distribution systems.
                </p>
                <ul className="list-none space-y-2 my-4">
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">⚡</span>
                    <span>Built-in Liquidity Management</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">⚡</span>
                    <span>Presale Functionalities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">⚡</span>
                    <span>Reward Distribution System</span>
                  </li>
                </ul>
              </div>

              {/* Factory V1 */}
              <div className="bg-black/20 rounded-lg p-6 border border-red-500/20">
                <h3 className="text-2xl font-bold text-red-400 mb-4">Factory V1 – Basic ERC20 Factory</h3>
                <p className="text-lg mb-4">
                  Simple and reliable token creation with essential features for basic ERC20 tokens.
                </p>
                <ul className="list-none space-y-2 my-4">
                  <li className="flex items-start">
                    <span className="text-red-400 mr-2">⚡</span>
                    <span>Basic Token Functions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-400 mr-2">⚡</span>
                    <span>Blacklist Systems</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-400 mr-2">⚡</span>
                    <span>Time Lock Features</span>
                  </li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6">Introducing the TokenHub.dev Factory Lineup</h2>
            
            <p className="mb-6">
              We've designed a suite of specialized Token Factories to cater to every aspect of blockchain innovation, from simple ERC20 tokens to full-fledged DeFi platforms and NFT collections.
            </p>
            
            <h3 className="text-xl font-bold text-white mt-10 mb-4">1. Token Factory V4 – The Most Advanced Token Creation Suite</h3>
            
            <p className="mb-4">
              Our flagship Token Factory V4 is packed with features that allow you to design and deploy sophisticated tokenomics effortlessly.
            </p>
            
            <p className="font-medium mb-2">Key Features:</p>
            
            <ul className="list-none space-y-2 my-6">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Dynamic Fee System – Transaction fees automatically adjust based on trading volume, ensuring a sustainable and self-balancing ecosystem.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Automated Liquidity Generation – A portion of each transaction can automatically be allocated to liquidity pools, keeping your token liquid and stable.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Auto-Buybacks & Burns – Smart buyback triggers and deflationary burn mechanics help maintain price stability and long-term growth.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Holder Rewards & Redistribution – Reward token holders through reflections, staking incentives, or automated profit-sharing mechanisms.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Anti-Dump Protections – Protect your project from whales and market manipulators with anti-dump mechanisms, time locks, and maximum transaction limits.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Elastic Supply Adjustments – Schedule supply increases or reductions dynamically to maintain balance and prevent inflation.</span>
              </li>
            </ul>
            
            <p className="mb-10">
              With Token Factory V4, you get the flexibility to create tokens that are not just functional but also designed for longevity and growth.
            </p>
            
            <div className="my-10 border-t border-gray-700"></div>
            
            <h3 className="text-xl font-bold text-white mt-10 mb-4">2. DeFi Lending Factory – Build Your Own Decentralized Bank</h3>
            
            <p className="mb-4">
              DeFi (Decentralized Finance) is revolutionizing the financial world, and TokenHub.dev provides an end-to-end solution for launching a DeFi lending and borrowing platform.
            </p>
            
            <p className="font-medium mb-2">Key Features:</p>
            
            <ul className="list-none space-y-2 my-6">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Collateralized Loans – Users can borrow crypto assets using other tokens as collateral.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Fixed & Variable Interest Rates – Customize interest models based on market demand.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Automated Liquidation – Protect lenders with auto-liquidation mechanisms if collateral value drops below a certain threshold.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Yield Farming & Staking – Allow users to earn passive income by supplying liquidity.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Smart Risk Management – Built-in lending caps, risk scores, and collateralization ratios to ensure sustainability.</span>
              </li>
            </ul>
            
            <p className="mb-10">
              With our DeFi Lending Factory, you can compete with Aave, Compound, and MakerDAO, launching your own lending protocol in minutes.
            </p>
            
            <div className="my-10 border-t border-gray-700"></div>
            
            <h3 className="text-xl font-bold text-white mt-10 mb-4">3. NFT Creation Factory – Powering Digital Ownership & Creativity</h3>
            
            <p className="mb-4">
              The NFT market is booming, and TokenHub.dev makes it easy for artists, brands, game developers, and content creators to mint, manage, and sell NFTs with zero coding required.
            </p>
            
            <p className="font-medium mb-2">Key Features:</p>
            
            <ul className="list-none space-y-2 my-6">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Customizable NFT Minting – Design unique NFTs for art, music, gaming assets, and more.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Royalty Distribution – Ensure that creators earn a percentage of resale transactions automatically.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Multi-Chain Deployment – Mint NFTs on Ethereum, BSC, Polygon, and other networks.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Whitelist & Presale Features – Control who can mint and buy your NFTs before public sales.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Built-in Marketplace Integration – List NFTs instantly on popular NFT marketplaces like OpenSea and Rarible.</span>
              </li>
            </ul>
            
            <p className="mb-10">
              Whether you're launching a generative art project, an in-game asset economy, or a membership-based NFT community, TokenHub.dev has all the tools you need.
            </p>
            
            <div className="my-10 border-t border-gray-700"></div>
            
            <h3 className="text-xl font-bold text-white mt-10 mb-4">4. DEX Listing Factory – Get Your Token on Decentralized Exchanges</h3>
            
            <p className="mb-4">
              Launching a token is just the beginning—getting it listed on DEXs like Uniswap and PancakeSwap is what brings liquidity and trading volume. Our DEX Listing Factory ensures your token is immediately available for trading.
            </p>
            
            <p className="font-medium mb-2">Key Features:</p>
            
            <ul className="list-none space-y-2 my-6">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Multi-DEX Support – List on Uniswap, PancakeSwap, QuickSwap, and more.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Anti-Bot & Anti-Whale Measures – Prevent pump-and-dump attacks and bot manipulation.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Liquidity Auto-Locking – Protect investors by ensuring liquidity cannot be rugged.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Token Trading Restrictions – Set buy/sell limits to avoid early market volatility.</span>
              </li>
            </ul>
            
            <p className="mb-6">
              No need to manually set up liquidity pools or contracts—TokenHub.dev handles it all.
            </p>
            
            <div className="my-10 border-t border-gray-700"></div>
            
            <h2 className="text-2xl font-bold text-white mt-10 mb-4">Security & Compliance – Our Top Priority</h2>
            
            <p className="mb-4">
              In blockchain, security is everything. That's why TokenHub.dev is built with the highest security standards, ensuring that your assets, users, and investors are fully protected.
            </p>
            
            <ul className="list-none space-y-2 my-6">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Fully Audited Smart Contracts – No vulnerabilities, no exploits.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Owner/Admin Control Panels – Easily manage your project without risking decentralization.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Anti-Exploit Mechanisms – Protection against common threats like flash loan attacks and front-running.</span>
              </li>
            </ul>
            
            <p className="mb-10">
              We take regulatory compliance seriously and provide customizable governance models so that projects can remain transparent and legally compliant.
            </p>
            
            <div className="my-10 border-t border-gray-700"></div>
            
            <h2 className="text-2xl font-bold text-white mt-10 mb-4">User-Friendly Experience with Full Support</h2>
            
            <p className="mb-4">
              At TokenHub.dev, we believe creating tokens and DeFi platforms should be easy for everyone. That's why we provide:
            </p>
            
            <ul className="list-none space-y-2 my-6">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Step-by-Step Guides & Tutorials – No coding required.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>Intuitive Interface – Build, deploy, and manage assets without complex configurations.</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>24/7 Community Support – Join our Discord and Telegram to connect with our team and other builders.</span>
              </li>
            </ul>
            
            <div className="my-10 border-t border-gray-700"></div>
            
            <h2 className="text-2xl font-bold text-white mt-10 mb-6">Join the TokenHub.dev Revolution</h2>
            
            <p className="mb-4">
              The blockchain industry is moving fast, and TokenHub.dev is your launchpad for success.
            </p>
            
            <p className="mb-8">
              Whether you're building a next-gen token, a DeFi lending platform, or an NFT empire, we give you the power to turn your vision into reality—quickly, securely, and affordably.
            </p>
            
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-6 mt-10">
              <p className="text-xl font-medium text-white text-center">
                Start building today at TokenHub.dev and take control of your blockchain future!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutPage; 