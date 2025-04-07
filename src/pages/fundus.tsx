import { NextPage } from 'next';
import Head from 'next/head';
import { FiHeart, FiCoffee, FiCode, FiGift, FiExternalLink, FiCircle, FiHexagon, FiTriangle, FiLink } from 'react-icons/fi';
import { FaBitcoin, FaEthereum } from 'react-icons/fa';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const FundUsPage: NextPage = () => {
  const [copySuccess, setCopySuccess] = useState<{[key: string]: boolean}>({
    eth: false,
    btc: false,
    arbitrum: false,
    polygon: false,
    optimism: false
  });

  // Sample wallet addresses - replace with actual project wallets
  const walletAddresses = {
    eth: '0x37DB73EaeA41B2546549e102520c559919DB30Da',
    btc: 'bc1p9u25p8nch94e6s8ewdst9087g58vxjkz0cudnrysux93lnnf4lrsntpvxy',
    arbitrum: '0x37DB73EaeA41B2546549e102520c559919DB30Da',
    polygon: '0x37DB73EaeA41B2546549e102520c559919DB30Da',
    optimism: '0x37DB73EaeA41B2546549e102520c559919DB30Da'
  };

  // Affiliate links for exchanges - replace with actual affiliate links
  const affiliateLinks = {
    coinbase: "https://www.coinbase.com/join/YOUR_AFFILIATE_CODE",
    binance: "https://accounts.binance.com/en/register?ref=YOUR_AFFILIATE_CODE",
    kraken: "https://www.kraken.com?clickid=YOUR_AFFILIATE_CODE",
    uniswap: "https://app.uniswap.org"
  };

  const copyToClipboard = async (type: 'eth' | 'btc' | 'arbitrum' | 'polygon' | 'optimism') => {
    try {
      await navigator.clipboard.writeText(walletAddresses[type]);
      setCopySuccess({ ...copySuccess, [type]: true });
      setTimeout(() => {
        setCopySuccess({ ...copySuccess, [type]: false });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <>
      <Head>
        <title>Support TokenHub.dev | Fund Us</title>
        <meta name="description" content="Support TokenHub.dev by contributing to the future development of useful crypto tools" />
      </Head>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Support TokenHub.dev (Fund Us)</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Your contributions help us continue building innovative tools for the crypto community. Support our mission and be part of shaping the future of blockchain technology.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-blue-500/20 bg-gradient-to-b from-blue-900/20 to-transparent">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <FiCode className="h-6 w-6 text-blue-400" />
              </div>
              <CardTitle>Continuous Development</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                Your support helps us develop new features and improve existing tools at a faster pace.
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-b from-purple-900/20 to-transparent">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                <FiHeart className="h-6 w-6 text-purple-400" />
              </div>
              <CardTitle>Community Expansion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                Help us grow the community and provide more educational resources for users of all levels.
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-gradient-to-b from-green-900/20 to-transparent">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <FiCoffee className="h-6 w-6 text-green-400" />
              </div>
              <CardTitle>Tool Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                Contributions keep our servers running and ensure tools remain up-to-date with blockchain standards.
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 bg-gradient-to-b from-yellow-900/20 to-transparent">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                <FiGift className="h-6 w-6 text-yellow-400" />
              </div>
              <CardTitle>Future Innovations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                Funding helps us research and develop cutting-edge blockchain solutions before anyone else.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Contribution Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* ETH Contribution */}
          <Card className="border-blue-500/30 bg-gradient-to-b from-blue-900/30 to-transparent">
            <CardHeader className="pb-2">
              <div className="flex items-center mb-2">
                <FaEthereum className="w-8 h-8 text-blue-400 mr-3" />
                <CardTitle className="text-2xl">Ethereum (ETH)</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                Send ETH to support the development of TokenHub
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-700 mb-2">
                <div className="font-bold text-lg text-white mb-1 text-center">404nf.eth</div>
                <div className="font-mono text-xs break-all text-gray-400 text-center">{walletAddresses.eth}</div>
              </div>
              <div className="text-sm text-gray-400 my-2">
                Scan the QR code or copy the address to donate
              </div>
              <div className="flex justify-center my-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG 
                    value={walletAddresses.eth}
                    size={160}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"L"}
                    includeMargin={false}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="primary" 
                className="w-full" 
                onClick={() => copyToClipboard('eth')}
              >
                {copySuccess.eth ? "Copied!" : "Copy ETH Address"}
              </Button>
            </CardFooter>
          </Card>

          {/* BTC Contribution */}
          <Card className="border-yellow-500/30 bg-gradient-to-b from-yellow-900/30 to-transparent">
            <CardHeader className="pb-2">
              <div className="flex items-center mb-2">
                <FaBitcoin className="w-8 h-8 text-yellow-400 mr-3" />
                <CardTitle className="text-2xl">Bitcoin (BTC)</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                Send BTC to support the development of TokenHub
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-700 break-all font-mono text-xs mb-2 text-center">
                {walletAddresses.btc}
              </div>
              <div className="text-sm text-gray-400 my-2">
                Scan the QR code or copy the address to donate
              </div>
              <div className="flex justify-center my-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG 
                    value={walletAddresses.btc}
                    size={160}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"L"}
                    includeMargin={false}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="primary" 
                className="w-full bg-yellow-600 hover:bg-yellow-700" 
                onClick={() => copyToClipboard('btc')}
              >
                {copySuccess.btc ? "Copied!" : "Copy BTC Address"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Layer 2 and ERC-20 Token Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">We Accept Many Token Types</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Arbitrum Token */}
            <Card className="border-blue-500/20 bg-gradient-to-b from-indigo-900/20 to-transparent">
              <CardHeader className="pb-2">
                <div className="flex items-center mb-2">
                  <FiCircle className="w-7 h-7 text-blue-400 mr-3" />
                  <CardTitle>Arbitrum (ARB)</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Layer 2 scaling solution for Ethereum
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-700 mb-2">
                  <div className="font-bold text-base text-white mb-1 text-center">404nf.eth</div>
                  <div className="font-mono text-xs break-all text-gray-400 text-center">{walletAddresses.arbitrum}</div>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full mt-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 text-sm py-1" 
                  onClick={() => copyToClipboard('arbitrum')}
                >
                  {copySuccess.arbitrum ? "Copied!" : "Copy Address"}
                </Button>
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2">Where to buy:</p>
                  <div className="flex flex-wrap gap-2">
                    <a 
                      href={affiliateLinks.binance} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded flex items-center"
                    >
                      Binance <FiExternalLink className="ml-1 h-3 w-3" />
                    </a>
                    <a 
                      href={affiliateLinks.coinbase} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded flex items-center"
                    >
                      Coinbase <FiExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Polygon Token */}
            <Card className="border-purple-500/20 bg-gradient-to-b from-purple-900/20 to-transparent">
              <CardHeader className="pb-2">
                <div className="flex items-center mb-2">
                  <FiHexagon className="w-7 h-7 text-purple-400 mr-3" />
                  <CardTitle>Polygon (MATIC)</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Layer 2 scaling solution with fast transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-700 mb-2">
                  <div className="font-bold text-base text-white mb-1 text-center">404nf.eth</div>
                  <div className="font-mono text-xs break-all text-gray-400 text-center">{walletAddresses.polygon}</div>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full mt-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 text-sm py-1" 
                  onClick={() => copyToClipboard('polygon')}
                >
                  {copySuccess.polygon ? "Copied!" : "Copy Address"}
                </Button>
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2">Where to buy:</p>
                  <div className="flex flex-wrap gap-2">
                    <a 
                      href={affiliateLinks.binance} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded flex items-center"
                    >
                      Binance <FiExternalLink className="ml-1 h-3 w-3" />
                    </a>
                    <a 
                      href={affiliateLinks.coinbase} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded flex items-center"
                    >
                      Coinbase <FiExternalLink className="ml-1 h-3 w-3" />
                    </a>
                    <a 
                      href={affiliateLinks.kraken} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded flex items-center"
                    >
                      Kraken <FiExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Optimism Token */}
            <Card className="border-red-500/20 bg-gradient-to-b from-red-900/20 to-transparent">
              <CardHeader className="pb-2">
                <div className="flex items-center mb-2">
                  <FiTriangle className="w-7 h-7 text-red-400 mr-3" />
                  <CardTitle>Optimism (OP)</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Layer 2 solution with optimistic rollups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-700 mb-2">
                  <div className="font-bold text-base text-white mb-1 text-center">404nf.eth</div>
                  <div className="font-mono text-xs break-all text-gray-400 text-center">{walletAddresses.optimism}</div>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full mt-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 text-sm py-1" 
                  onClick={() => copyToClipboard('optimism')}
                >
                  {copySuccess.optimism ? "Copied!" : "Copy Address"}
                </Button>
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2">Where to buy:</p>
                  <div className="flex flex-wrap gap-2">
                    <a 
                      href={affiliateLinks.coinbase} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded flex items-center"
                    >
                      Coinbase <FiExternalLink className="ml-1 h-3 w-3" />
                    </a>
                    <a 
                      href={affiliateLinks.binance} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded flex items-center"
                    >
                      Binance <FiExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Other ERC-20 Tokens Notice */}
          <div className="bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-blue-500/20">
            <h3 className="text-2xl font-bold text-white mb-4">We Accept All ERC-20 Tokens</h3>
            <p className="text-gray-300 mb-4">
              In addition to the tokens listed above, we accept contributions in any ERC-20 token on Ethereum mainnet, Polygon, Arbitrum, Optimism, and test networks including Sepolia and Goerli.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="flex items-center bg-gray-800/50 p-2 rounded-lg">
                <FiLink className="w-5 h-5 text-blue-400 mr-2" />
                <span className="text-gray-300 text-sm">Chainlink (LINK)</span>
              </div>
              <div className="flex items-center bg-gray-800/50 p-2 rounded-lg">
                <span className="text-yellow-400 mr-2 font-bold">DAI</span>
                <span className="text-gray-300 text-sm">DAI Stablecoin</span>
              </div>
              <div className="flex items-center bg-gray-800/50 p-2 rounded-lg">
                <span className="w-5 h-5 text-green-400 mr-2 font-bold">$</span>
                <span className="text-gray-300 text-sm">USDC</span>
              </div>
              <div className="flex items-center bg-gray-800/50 p-2 rounded-lg">
                <span className="w-5 h-5 text-pink-400 mr-2 font-bold">U</span>
                <span className="text-gray-300 text-sm">Uniswap (UNI)</span>
              </div>
            </div>
            
            <p className="text-gray-300 mb-3">You can use any of the following exchanges to purchase tokens:</p>
            <div className="flex flex-wrap gap-2">
              <a 
                href={affiliateLinks.coinbase} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded flex items-center"
              >
                Coinbase <FiExternalLink className="ml-2 h-4 w-4" />
              </a>
              <a 
                href={affiliateLinks.binance} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded flex items-center"
              >
                Binance <FiExternalLink className="ml-2 h-4 w-4" />
              </a>
              <a 
                href={affiliateLinks.kraken} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded flex items-center"
              >
                Kraken <FiExternalLink className="ml-2 h-4 w-4" />
              </a>
              <a 
                href={affiliateLinks.uniswap} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded flex items-center"
              >
                Uniswap <FiExternalLink className="ml-2 h-4 w-4" />
              </a>
            </div>
            
            <div className="mt-4 bg-yellow-900/20 p-3 rounded-lg border border-yellow-500/30">
              <p className="text-yellow-300 text-sm">
                <strong>Note:</strong> When contributing with tokens other than those specifically listed, please contact us with your transaction details so we can properly recognize your contribution.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xl font-medium text-white mb-2">How will the funds be used?</h3>
              <p className="text-gray-300">
                All contributions go directly toward development costs, server infrastructure, security audits, and expanding our suite of crypto tools.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xl font-medium text-white mb-2">Are contributions tax-deductible?</h3>
              <p className="text-gray-300">
                Contributions are currently not tax-deductible. Please consult with your tax advisor regarding how to report crypto donations.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xl font-medium text-white mb-2">Can I contribute other cryptocurrencies?</h3>
              <p className="text-gray-300">
                Yes! We accept all ERC-20 tokens across multiple networks as well as BTC. If you'd like to donate using another cryptocurrency not listed, please contact us directly.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-xl font-medium text-white mb-2">How can I get recognized for my contribution?</h3>
              <p className="text-gray-300">
                For significant contributions, we offer recognition on our supporters page. After donating, send us your transaction hash to verify your contribution.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center mt-12">
          <p className="text-gray-300">
            Have questions about contributing? <a href="https://t.me/getantonio" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    </>
  );
};

export default FundUsPage; 