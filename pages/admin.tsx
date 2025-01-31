import { useState, useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { BrowserProvider, Contract } from 'ethers';
import { Header } from '../components/Header';
import { Card } from '../components/ui/card';
import { Toast } from '../components/ui/Toast';
import { Spinner } from '../components/ui/Spinner';
import TokenFactoryV1 from '../contracts/abi/TokenFactory_v1.1.0.json';
import TokenFactoryV2 from '../contracts/abi/TokenFactory_v2.1.0.json';
import TokenAdmin from '../components/TokenAdmin';
import TokenAdminV2 from '../components/TokenAdminV2';
import { getNetworkContractAddress } from '../config/contracts';
import Head from 'next/head';
import { ethers } from 'ethers';

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

interface FactoryInfo {
  version: string;
  address: string;
  owner: string;
  deploymentFee: string;
  totalTokens: number;
  paused: boolean;
}

export default function AdminPage() {
  const { isConnected, provider, chainId } = useNetwork();
  const [factoryV1Info, setFactoryV1Info] = useState<FactoryInfo | null>(null);
  const [factoryV2Info, setFactoryV2Info] = useState<FactoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>();

  useEffect(() => {
    const getWalletAddress = async () => {
      if (isConnected && provider) {
        try {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setWalletAddress(address);
        } catch (error) {
          console.error("Error getting wallet address:", error);
        }
      }
    };

    getWalletAddress();
  }, [isConnected, provider]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadFactoryInfo = async () => {
    if (!isConnected || !provider || !chainId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Load V1 Factory
      const factoryV1Address = getNetworkContractAddress(chainId, 'factoryAddress');
      if (factoryV1Address) {
        try {
          const factoryV1 = new Contract(factoryV1Address, TokenFactoryV1.abi, provider);
          const code = await provider.getCode(factoryV1Address);
          
          if (code !== '0x') {
            console.log("Loading V1 factory at:", factoryV1Address);
            const [owner, fee, paused] = await Promise.all([
              factoryV1.owner(),
              factoryV1.deploymentFee(),
              factoryV1.paused()
            ]);

            // Get total tokens from events
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);
            const filter = {
              address: factoryV1Address,
              fromBlock,
              toBlock: currentBlock,
              topics: [ethers.id("TokenCreated(address,string,string)")]
            };
            const logs = await provider.getLogs(filter);

            setFactoryV1Info({
              version: '1.0',
              address: factoryV1Address,
              owner,
              deploymentFee: fee.toString(),
              totalTokens: logs.length,
              paused
            });
          }
        } catch (error) {
          console.error("Error loading V1 factory:", error);
        }
      }

      // Load V2 Factory
      const factoryV2Address = getNetworkContractAddress(chainId, 'factoryAddressV2');
      if (factoryV2Address) {
        try {
          const factoryV2 = new Contract(factoryV2Address, TokenFactoryV2.abi, provider);
          const code = await provider.getCode(factoryV2Address);
          
          if (code !== '0x') {
            console.log("Loading V2 factory at:", factoryV2Address);
            const [owner, fee, paused] = await Promise.all([
              factoryV2.owner(),
              factoryV2.deploymentFee(),
              factoryV2.paused()
            ]);

            // Get total tokens from events
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);
            const filter = {
              address: factoryV2Address,
              fromBlock,
              toBlock: currentBlock,
              topics: [ethers.id("TokenCreated(address,string,string,address)")]
            };
            const logs = await provider.getLogs(filter);

            setFactoryV2Info({
              version: '2.0',
              address: factoryV2Address,
              owner,
              deploymentFee: fee.toString(),
              totalTokens: logs.length,
              paused
            });
          }
        } catch (error) {
          console.error("Error loading V2 factory:", error);
        }
      }
    } catch (error) {
      console.error("Error loading factory info:", error);
      showToast('error', 'Failed to load factory information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFactoryInfo();
  }, [isConnected, provider, chainId]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Head>
          <title>TokenHub.dev - Admin Panel</title>
          <meta name="description" content="TokenHub.dev admin panel for factory management" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gray-800 border-gray-700">
              <div className="p-6 text-center text-gray-400">
                Please connect your wallet to access the admin panel
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Admin Panel</title>
        <meta name="description" content="Manage token factory settings and configurations" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Factory Admin Panel</h1>
            <p className="text-sm text-gray-400">Manage token factory settings and configurations</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !factoryV1Info && !factoryV2Info ? (
            <Card className="bg-gray-800 border-gray-700">
              <div className="p-6 text-center text-gray-400">
                No factory contracts found on this network
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Factory Information */}
              {factoryV1Info && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white">Factory V1</h2>
                  <Card className="bg-gray-800 border-gray-700">
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-gray-400">Address: <span className="text-white">{factoryV1Info.address}</span></div>
                        <div className="text-gray-400">Owner: <span className="text-white">{factoryV1Info.owner}</span></div>
                        <div className="text-gray-400">Deployment Fee: <span className="text-white">{factoryV1Info.deploymentFee} ETH</span></div>
                        <div className="text-gray-400">Total Tokens: <span className="text-white">{factoryV1Info.totalTokens}</span></div>
                        <div className="text-gray-400">Status: <span className={factoryV1Info.paused ? 'text-red-500' : 'text-green-500'}>
                          {factoryV1Info.paused ? 'Paused' : 'Active'}
                        </span></div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {factoryV2Info && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white">Factory V2</h2>
                  <Card className="bg-gray-800 border-gray-700">
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-gray-400">Address: <span className="text-white">{factoryV2Info.address}</span></div>
                        <div className="text-gray-400">Owner: <span className="text-white">{factoryV2Info.owner}</span></div>
                        <div className="text-gray-400">Deployment Fee: <span className="text-white">{factoryV2Info.deploymentFee} ETH</span></div>
                        <div className="text-gray-400">Total Tokens: <span className="text-white">{factoryV2Info.totalTokens}</span></div>
                        <div className="text-gray-400">Status: <span className={factoryV2Info.paused ? 'text-red-500' : 'text-green-500'}>
                          {factoryV2Info.paused ? 'Paused' : 'Active'}
                        </span></div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Token Management */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Token Management</h2>
                <div className="space-y-4">
                  <TokenAdmin isConnected={isConnected} address={walletAddress} />
                  <TokenAdminV2 isConnected={isConnected} address={walletAddress} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
} 