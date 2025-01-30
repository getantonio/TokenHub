import { useState, useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { BrowserProvider, Contract } from 'ethers';
import { Header } from '../components/Header';
import { Card } from '../components/ui/Card';
import { Toast } from '../components/ui/Toast';
import { Spinner } from '../components/ui/Spinner';
import TokenFactoryV1 from '../contracts/abi/TokenFactory_v1.1.0.json';
import TokenFactoryV2 from '../contracts/abi/TokenFactory_v2.1.0.json';
import { getNetworkContractAddress } from '../config/contracts';
import Head from 'next/head';

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
  const { chainId } = useNetwork();
  const [isConnected, setIsConnected] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<string>('');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [factoryInfo, setFactoryInfo] = useState<FactoryInfo[]>([]);
  const [newFee, setNewFee] = useState<string>('');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request<string[]>({ 
            method: 'eth_accounts' 
          });
          setIsConnected(Array.isArray(accounts) && accounts.length > 0);

          // Listen for account changes
          const handleAccountsChanged = (accounts: unknown) => {
            setIsConnected(Array.isArray(accounts) && accounts.length > 0);
          };

          window.ethereum.on('accountsChanged', handleAccountsChanged);

          return () => {
            window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
          };
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum && isConnected) {
        try {
          const newProvider = new BrowserProvider(window.ethereum);
          setProvider(newProvider);
        } catch (error) {
          console.error("Error initializing provider:", error);
        }
      }
    };

    initProvider();
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && chainId && provider) {
      loadFactoryInfo();
    }
  }, [isConnected, chainId, provider]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadFactoryInfo = async () => {
    if (!isConnected || !window.ethereum || !chainId || !provider) {
      console.error("Missing dependencies");
      return;
    }

    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      const currentAddress = await signer.getAddress();
      setCurrentWallet(currentAddress);

      const factories: FactoryInfo[] = [];

      // Load V1 Factory Info
      const v1Address = getNetworkContractAddress(chainId, 'factoryAddress');
      if (v1Address) {
        const v1Factory = new Contract(v1Address, TokenFactoryV1.abi, provider);
        const [owner, deploymentFee, totalTokens, paused] = await Promise.all([
          v1Factory.owner(),
          v1Factory.deploymentFee(),
          v1Factory.getDeployedTokens().then((tokens: string[]) => tokens.length),
          v1Factory.paused()
        ]);

        factories.push({
          version: 'v1',
          address: v1Address,
          owner,
          deploymentFee: deploymentFee.toString(),
          totalTokens,
          paused
        });
      }

      // Load V2 Factory Info
      const v2Address = getNetworkContractAddress(chainId, 'factoryAddressV2');
      if (v2Address) {
        const v2Factory = new Contract(v2Address, TokenFactoryV2.abi, provider);
        const [owner, deploymentFee, totalTokens, paused] = await Promise.all([
          v2Factory.owner(),
          v2Factory.deploymentFee(),
          v2Factory.getDeployedTokens().then((tokens: string[]) => tokens.length),
          v2Factory.paused()
        ]);

        factories.push({
          version: 'v2',
          address: v2Address,
          owner,
          deploymentFee: deploymentFee.toString(),
          totalTokens,
          paused
        });
      }

      setFactoryInfo(factories);
    } catch (error: any) {
      console.error('Error loading factory info:', error);
      showToast('error', error.message || 'Failed to load factory info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetFee = async (version: string, fee: string) => {
    if (!isConnected || !window.ethereum || !chainId || !provider) return;

    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      const factoryAddress = getNetworkContractAddress(chainId, version === 'v1' ? 'factoryAddress' : 'factoryAddressV2');
      
      if (!factoryAddress) {
        showToast('error', `No ${version} factory deployed on this network`);
        return;
      }

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactoryV1.abi : TokenFactoryV2.abi,
        signer
      );

      const tx = await factory.setDeploymentFee(fee);
      showToast('success', 'Transaction submitted...');
      
      await tx.wait();
      showToast('success', 'Deployment fee updated successfully');
      loadFactoryInfo();
    } catch (error: any) {
      console.error('Error setting fee:', error);
      showToast('error', error.message || 'Failed to set fee');
    } finally {
      setIsLoading(false);
      setNewFee('');
    }
  };

  const handleTogglePause = async (version: string) => {
    if (!isConnected || !window.ethereum || !chainId || !provider) return;

    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      const factoryAddress = getNetworkContractAddress(chainId, version === 'v1' ? 'factoryAddress' : 'factoryAddressV2');
      
      if (!factoryAddress) {
        showToast('error', `No ${version} factory deployed on this network`);
        return;
      }

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactoryV1.abi : TokenFactoryV2.abi,
        signer
      );

      const isPaused = await factory.paused();
      const tx = await factory[isPaused ? 'unpause' : 'pause']();
      showToast('success', 'Transaction submitted...');
      
      await tx.wait();
      showToast('success', `Factory ${isPaused ? 'unpaused' : 'paused'} successfully`);
      loadFactoryInfo();
    } catch (error: any) {
      console.error('Error toggling pause:', error);
      showToast('error', error.message || 'Failed to toggle pause');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferOwnership = async (version: string, newOwner: string) => {
    if (!isConnected || !window.ethereum || !chainId || !provider) return;

    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      const factoryAddress = getNetworkContractAddress(chainId, version === 'v1' ? 'factoryAddress' : 'factoryAddressV2');
      
      if (!factoryAddress) {
        showToast('error', `No ${version} factory deployed on this network`);
        return;
      }

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactoryV1.abi : TokenFactoryV2.abi,
        signer
      );

      const tx = await factory.transferOwnership(newOwner);
      showToast('success', 'Transaction submitted...');
      
      await tx.wait();
      showToast('success', 'Ownership transferred successfully');
      loadFactoryInfo();
    } catch (error: any) {
      console.error('Error transferring ownership:', error);
      showToast('error', error.message || 'Failed to transfer ownership');
    } finally {
      setIsLoading(false);
    }
  };

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
              <div className="p-4">
                <h1 className="text-xl font-bold text-white mb-2">Factory Admin Panel</h1>
                <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
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
        <meta name="description" content="TokenHub.dev admin panel for factory management" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <div className="p-4">
              <h1 className="text-xl font-bold text-white mb-2">Factory Admin Panel</h1>
              <p className="text-gray-400">Manage token factory settings and configurations.</p>
            </div>
          </Card>

          {toast && <Toast type={toast.type} message={toast.message} />}

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Spinner className="w-8 h-8 text-blue-500" />
            </div>
          ) : factoryInfo.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <div className="p-4">
                <p className="text-gray-400">No factory contracts found on this network.</p>
              </div>
            </Card>
          ) : (
            factoryInfo.map((factory) => (
              <Card key={factory.version} className="bg-gray-800 border-gray-700">
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-bold text-white">Token Factory {factory.version}</h2>
                      <p className="text-sm text-gray-400">Address: {factory.address}</p>
                      <p className="text-sm text-gray-400">Owner: {factory.owner}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Total Tokens: {factory.totalTokens}</p>
                      <p className="text-sm text-gray-400">
                        Status: <span className={factory.paused ? 'text-red-500' : 'text-green-500'}>
                          {factory.paused ? 'Paused' : 'Active'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {factory.owner.toLowerCase() === currentWallet.toLowerCase() ? (
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                      {/* Deployment Fee Management */}
                      <div>
                        <h3 className="text-sm font-medium text-white mb-2">Deployment Fee</h3>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newFee}
                            onChange={(e) => setNewFee(e.target.value)}
                            placeholder={`Current: ${factory.deploymentFee} Wei`}
                            className="flex-1 px-2 py-1 text-sm rounded bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleSetFee(factory.version, newFee)}
                            className="px-3 py-1 text-sm font-medium rounded bg-blue-500 text-white hover:bg-blue-600"
                          >
                            Update Fee
                          </button>
                        </div>
                      </div>

                      {/* Pause/Unpause */}
                      <div>
                        <h3 className="text-sm font-medium text-white mb-2">Factory Control</h3>
                        <button
                          onClick={() => handleTogglePause(factory.version)}
                          className={`px-3 py-1 text-sm font-medium rounded ${
                            factory.paused
                              ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                              : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                          }`}
                        >
                          {factory.paused ? 'Unpause Factory' : 'Pause Factory'}
                        </button>
                      </div>

                      {/* Transfer Ownership */}
                      <div>
                        <h3 className="text-sm font-medium text-white mb-2">Transfer Ownership</h3>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="New owner address"
                            className="flex-1 px-2 py-1 text-sm rounded bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleTransferOwnership(factory.version, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              const input = document.querySelector('input[placeholder="New owner address"]') as HTMLInputElement;
                              if (input) {
                                handleTransferOwnership(factory.version, input.value);
                                input.value = '';
                              }
                            }}
                            className="px-3 py-1 text-sm font-medium rounded bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                          >
                            Transfer
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 pt-4 border-t border-gray-700">
                      You are not the owner of this factory contract.
                    </p>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
} 