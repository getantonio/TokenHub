import React, { useState } from 'react';
import Head from 'next/head';
import { CreatePoolForm } from '@/components/defi/CreatePoolForm';
import { PoolDashboard } from '@/components/defi/PoolDashboard';
import { Footer } from '@/components/layouts/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DefiLoanPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Factory address should be taken from environment variable or config in a real app
  const factoryAddress = process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS || '0x1234567890123456789012345678901234567890';

  // Handle pool creation success
  const handlePoolCreated = () => {
    setActiveTab('dashboard');
  };

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
                  <Button 
                    className="bg-white text-gray-900 hover:bg-gray-100"
                    onClick={() => window.open('/docs/defi-loan', '_blank')}
                  >
                    View Documentation
                  </Button>
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