import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { CreatePoolForm } from '@/components/defi/CreatePoolForm';
import { PoolDashboard } from '@/components/defi/PoolDashboard';
import { Footer } from '@/components/layouts/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuestionMarkCircledIcon, SpeakerLoudIcon } from "@radix-ui/react-icons";

export default function DefiLoanPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Factory address should be taken from environment variable or config in a real app
  const factoryAddress = process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS || '0x1234567890123456789012345678901234567890';

  // Log environment variables and configuration
  useEffect(() => {
    console.log("DeFi Loan page loaded");
    console.log("Using factory address:", factoryAddress);
    console.log("NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS:", process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS);
    
    // List all environment variables related to contracts
    const contractEnvVars = Object.keys(process.env)
      .filter(key => key.includes('CONTRACT') || key.includes('FACTORY') || key.includes('ADDRESS'))
      .reduce((obj, key) => {
        obj[key] = process.env[key];
        return obj;
      }, {} as Record<string, string | undefined>);
    
    console.log("Contract-related environment variables:", contractEnvVars);
  }, [factoryAddress]);

  // Load available voices when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthesisRef.current = window.speechSynthesis;
      
      // Function to get and set voices
      const loadVoices = () => {
        const availableVoices = speechSynthesisRef.current?.getVoices() || [];
        setVoices(availableVoices);
      };
      
      // Initial load attempt
      loadVoices();
      
      // Set up event listener for when voices change/load
      speechSynthesisRef.current?.addEventListener('voiceschanged', loadVoices);
      
      // Cleanup
      return () => {
        speechSynthesisRef.current?.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  // Handle pool creation success
  const handlePoolCreated = () => {
    setActiveTab('dashboard');
  };

  // Handle text-to-speech functionality
  const handleTextToSpeech = () => {
    if (typeof window !== 'undefined' && speechSynthesisRef.current) {
      if (isReading) {
        speechSynthesisRef.current.cancel();
        setIsReading(false);
        return;
      }
      
      const text = document.querySelector('.dialog-content')?.textContent || '';
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Slow down the speech rate
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      
      // Set a male voice if available
      const maleVoice = voices.find(voice => 
        voice.name.includes('Male') || 
        (voice.name.toLowerCase().includes('male') && !voice.name.toLowerCase().includes('female')) ||
        (voice.name.includes('Google') && !voice.name.includes('Female'))
      );
      
      if (maleVoice) {
        console.log('Using male voice:', maleVoice.name);
        utterance.voice = maleVoice;
      } else if (voices.length > 0) {
        // Fall back to first available voice if no male voice is found
        utterance.voice = voices[0];
      }
      
      utterance.onend = () => setIsReading(false);
      
      speechSynthesisRef.current.speak(utterance);
      setIsReading(true);
    }
  };

  // Stop reading when dialog closes
  React.useEffect(() => {
    if (!dialogOpen && isReading && speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsReading(false);
    }
  }, [dialogOpen, isReading]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-900">
      <Head>
        <title>DeFi Loan Factory | Token Factory</title>
        <meta name="description" content="Create and manage DeFi lending pools" />
      </Head>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">DeFi Loan Factory</h1>
            <p className="text-xl text-gray-400">Create and manage decentralized lending pools for any ERC20 token</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-800 text-white">
              <DialogHeader className="flex flex-row items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold text-white">Understanding DeFi Lending</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    Learn the basics of DeFi lending pools and how to create one
                  </DialogDescription>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={handleTextToSpeech}
                  className={`p-2 rounded-full hover:bg-gray-700 ${isReading ? 'text-blue-400' : 'text-gray-400'}`}
                  title={isReading ? "Stop reading" : "Read content aloud"}
                  aria-label={isReading ? "Stop reading" : "Read content aloud"}
                >
                  <SpeakerLoudIcon className="h-5 w-5" />
                </Button>
              </DialogHeader>
              
              <div className="space-y-4 mt-4 text-gray-200 dialog-content">
                <h3 className="text-lg font-semibold text-white">What is a DeFi Lending Pool?</h3>
                <p>
                  A DeFi lending pool is a smart contract-based system that allows users to deposit assets to earn interest,
                  while others can borrow those assets by providing collateral. This creates an efficient marketplace for capital
                  without traditional intermediaries like banks.
                </p>
                
                <h3 className="text-lg font-semibold text-white">Key Concepts</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><span className="font-medium">Deposits:</span> Users supply assets to the pool and earn interest based on borrower demand</li>
                  <li><span className="font-medium">Collateral:</span> Assets provided by borrowers to secure their loans</li>
                  <li><span className="font-medium">Borrowing:</span> Users can take loans against their collateral</li>
                  <li><span className="font-medium">Liquidation:</span> Process to protect the protocol when a borrower's position becomes undercollateralized</li>
                  <li><span className="font-medium">Health Factor:</span> Metric showing the safety of a borrower's position</li>
                </ul>
                
                <h3 className="text-lg font-semibold text-white">Benefits of DeFi Lending</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><span className="font-medium">For Lenders:</span> Earn passive income by depositing assets</li>
                  <li><span className="font-medium">For Borrowers:</span> Access liquidity without selling assets</li>
                  <li><span className="font-medium">For Projects:</span> Increase utility for your token and generate revenue</li>
                  <li><span className="font-medium">Permissionless:</span> Anyone can participate without approval</li>
                  <li><span className="font-medium">Transparent:</span> All operations are visible on the blockchain</li>
                </ul>
                
                <h3 className="text-lg font-semibold text-white">Token Requirements</h3>
                <p>
                  You can create a lending pool for <strong>any valid ERC20 token</strong>, including tokens created with any 
                  of our token factories (V1, V2, V3, V4). The token just needs to follow the standard ERC20 interface.
                </p>
                
                <h3 className="text-lg font-semibold text-white">Best Token Type for DeFi Lending</h3>
                <p>
                  If you're creating a token specifically for your lending pool, we recommend the following:
                </p>
                
                <div className="bg-gray-700 p-4 rounded-md mt-2 mb-4">
                  <h4 className="font-medium text-white">Recommended Token Features:</h4>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li><span className="font-medium">Standard ERC20 Compliance</span> - Use our V3 or V4 token factory</li>
                    <li><span className="font-medium">Fixed Supply</span> - Avoids inflation that can complicate lending</li>
                    <li><span className="font-medium">No Transaction Fees</span> - Fees complicate lending calculations</li>
                    <li><span className="font-medium">No Rebasing</span> - Elastic supply tokens create accounting issues</li>
                    <li><span className="font-medium">18 Decimals</span> - Standard precision is best for compatibility</li>
                  </ul>
                  
                  <h4 className="font-medium text-white mt-4">Best Factory Option:</h4>
                  <p className="mt-1">
                    Use our <strong>V3 Token Factory</strong> for a clean ERC20 implementation with no built-in fees that
                    could interfere with lending operations.
                  </p>
                  
                  <h4 className="font-medium text-white mt-4">For Advanced Use Cases:</h4>
                  <p className="mt-1">
                    The <strong>V4 Factory with Distribution</strong> is excellent if you want to allocate tokens for:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Initial liquidity provision for the lending pool</li>
                    <li>Staking rewards to incentivize depositors</li>
                    <li>Treasury reserves for protocol governance</li>
                  </ul>
                  
                  <h4 className="font-medium text-white mt-4">Using ETH:</h4>
                  <p className="mt-1">
                    Direct ETH cannot be used to create a lending pool, but you can use <strong>WETH (Wrapped ETH)</strong>, which is an ERC20 version of ETH that's fully compatible with lending pools.
                  </p>
                </div>
                
                <h3 className="text-lg font-semibold text-white">Key Parameters</h3>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-white">Collateral Factor</h4>
                  <p>
                    Determines how much users can borrow against their collateral. For example, with a 75% collateral factor,
                    users can borrow up to 75% of their collateral's value.
                  </p>
                  <p className="text-yellow-400 text-sm">
                    Higher values (e.g., 80%) allow more borrowing but increase risk.
                    Lower values (e.g., 50%) are more conservative and safer.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-white">Reserve Factor</h4>
                  <p>
                    Percentage of interest that goes to the protocol's reserves. For example, with a 10% reserve factor,
                    10% of all interest goes to reserves, while 90% goes to depositors.
                  </p>
                  <p className="text-yellow-400 text-sm">
                    Higher values increase protocol revenue but reduce depositor yield.
                    Lower values offer more competitive yields for depositors.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-white">Protocol Fee</h4>
                  <p>
                    Our platform charges a small fee to sustain and improve the service:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>One-time pool creation fee of 0.05 ETH</li>
                    <li>10% of the interest earned by the pool (taken before the reserve factor)</li>
                  </ul>
                  <p className="text-green-400 text-sm">
                    This hybrid model ensures fair pricing that scales with usage while minimizing upfront costs.
                  </p>
                </div>
                
                <h3 className="text-lg font-semibold text-white">After Creating a Pool</h3>
                <p>
                  Once your pool is active, users can:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Deposit assets to earn interest</li>
                  <li>Use their deposits as collateral to borrow other assets</li>
                  <li>Monitor their health factor to avoid liquidation</li>
                </ul>
                
                <p className="text-blue-400">
                  The health factor is a key metric that determines if a loan is safe or at risk of liquidation.
                  A health factor below 1.0 means the loan can be liquidated.
                </p>
                
                <h3 className="text-lg font-semibold text-white">How Liquidation Works</h3>
                <p>
                  When a borrower's health factor falls below 1.0, their position becomes eligible for liquidation to protect 
                  the lending pool and its depositors.
                </p>
                
                <div className="space-y-2 mt-2">
                  <h4 className="font-medium text-white">Liquidation Process</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>External liquidators can repay a portion of the borrower's debt</li>
                    <li>In return, they receive the equivalent value in the borrower's collateral, plus a bonus (5-10%)</li>
                    <li>This liquidation bonus comes from the borrower's collateral, not from the platform</li>
                    <li>The process ensures bad debt does not accumulate in the system</li>
                  </ul>
                </div>
                
                <div className="space-y-2 mt-4">
                  <h4 className="font-medium text-white">Impact on Platform Revenue</h4>
                  <p>
                    Liquidations don't directly generate or reduce platform profits. Instead, they help maintain the overall
                    health of the protocol, allowing it to continue generating revenue from:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>The one-time pool creation fee (0.05 ETH)</li>
                    <li>The 10% protocol fee on interest earned by the pool</li>
                  </ul>
                  <p className="text-yellow-400 text-sm mt-2">
                    By ensuring bad debt is promptly addressed, liquidations protect the protocol's long-term profitability
                    and sustainability.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-800">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600">Dashboard</TabsTrigger>
              <TabsTrigger value="create" className="data-[state=active]:bg-blue-600">Create New Pool</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard">
              <div className="space-y-8">
                {/* Original Landing Page Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  {/* Create New Pool Card */}
                  <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 hover:border-blue-500/40 transition-all">
                    <CardContent className="p-6">
                      <h2 className="text-2xl font-semibold text-white mb-4">Create New Lending Pool</h2>
                      <p className="text-gray-400 mb-6">Deploy a new lending pool with customizable parameters for any ERC20 token.</p>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setActiveTab('create')}
                      >
                        Launch Pool Creator
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Manage Pools Card */}
                  <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                    <CardContent className="p-6">
                      <h2 className="text-2xl font-semibold text-white mb-4">Manage Existing Pools</h2>
                      <p className="text-gray-400 mb-6">View and manage your deployed lending pools, monitor performance, and adjust parameters.</p>
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => document.getElementById('poolDashboardSection')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Open Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Features Section */}
                <div className="mb-12">
                  <h2 className="text-2xl font-semibold text-white mb-6">Key Features</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gray-800 border-gray-700/50">
                      <CardContent className="p-6">
                        <div className="text-3xl mb-4">🎛️</div>
                        <h3 className="text-lg font-semibold text-white mb-2">Customizable Parameters</h3>
                        <p className="text-gray-400">Set custom interest rates, collateral factors, and liquidation thresholds.</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-800 border-gray-700/50">
                      <CardContent className="p-6">
                        <div className="text-3xl mb-4">📊</div>
                        <h3 className="text-lg font-semibold text-white mb-2">Dynamic Interest Rates</h3>
                        <p className="text-gray-400">Automated interest rate model based on pool utilization.</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-800 border-gray-700/50">
                      <CardContent className="p-6">
                        <div className="text-3xl mb-4">🛡️</div>
                        <h3 className="text-lg font-semibold text-white mb-2">Risk Management</h3>
                        <p className="text-gray-400">Advanced liquidation engine with automated health factor monitoring.</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Documentation Section */}
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-semibold text-white mb-4">Ready to Get Started?</h2>
                  <p className="text-gray-400 mb-6">Check out our comprehensive documentation to learn more about creating and managing DeFi lending pools.</p>
                  <div className="flex justify-center">
                    <Button 
                      className="bg-white text-gray-900 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => setDialogOpen(true)}
                    >
                      <QuestionMarkCircledIcon className="h-5 w-5" />
                      <span>Understanding DeFi Lending</span>
                    </Button>
                  </div>
                </div>

                {/* Pool Dashboard Section */}
                <div id="poolDashboardSection">
                  <h2 className="text-2xl font-semibold text-white mb-6">Your Lending Pools</h2>
                  <PoolDashboard factoryAddress={factoryAddress as `0x${string}`} />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="create">
              <CreatePoolForm 
                onPoolCreated={handlePoolCreated} 
                factoryAddress={factoryAddress as `0x${string}`}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
} 